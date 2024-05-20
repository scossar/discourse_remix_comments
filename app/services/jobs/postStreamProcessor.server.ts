import { ZodError } from "zod";
import { type DiscourseRawEnv, discourseEnv } from "~/services/config.server";
import { getPostStreamKey } from "~/services/redisKeys.server";
import { validateDiscourseApiPostStream } from "~/schemas/discourseApiResponse.server";
import { getRedisClient } from "~/services/redisClient.server";
import { RedisError, ApiError } from "~/services/errors/appErrors.server";

export async function postStreamProcessor(topicId: number) {
  try {
    const json = await fetchPostStream(topicId, discourseEnv());
    const stream = validateDiscourseApiPostStream(json?.post_stream?.stream);
    await savePostStreamToRedis(getPostStreamKey(topicId), stream);
    return stream;
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`API error: ${error.message}`);
      throw error;
    } else if (error instanceof ZodError) {
      console.error("Error validating postStream");
      throw error;
    } else if (error instanceof RedisError) {
      console.error(`Redis error: ${error.message}`);
      throw error;
    } else {
      console.error("Unknown error");
      throw error;
    }
  }
}

async function fetchPostStream(topicId: number, config: DiscourseRawEnv) {
  const { apiKey, baseUrl } = config;

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");

  const postStreamUrl = `${baseUrl}/t/-/${topicId}.json`;

  const response = await fetch(postStreamUrl, { headers });
  if (!response.ok) {
    throw new ApiError(
      "Error fetching postStream from Discourse",
      response.status
    );
  }

  const json = await response.json();
  return json;
}

async function savePostStreamToRedis(redisKey: string, stream: number[]) {
  try {
    const client = await getRedisClient();
    await client.del(redisKey);
    await client.rpush(redisKey, ...stream);
  } catch (error) {
    throw new RedisError("Error obtaining Redis client");
  }
}
