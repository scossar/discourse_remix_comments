import { fromError } from "zod-validation-error";
import { discourseEnv } from "~/services/config.server";
import { getPostStreamKey } from "~/services/redisKeys.server";
import { validateDiscourseApiPostStream } from "~/schemas/discourseApiResponse.server";
import { getRedisClient } from "~/services/redisClient.server";

export async function postStreamProcessor(topicId: number) {
  const { apiKey, baseUrl } = discourseEnv();

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");

  const postStreamUrl = `${baseUrl}/t/-/${topicId}.json`;

  try {
    const response = await fetch(postStreamUrl, { headers });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const json = await response.json();

    let stream;
    try {
      stream = validateDiscourseApiPostStream(json?.post_stream?.stream);
    } catch (error) {
      const errorMessage = fromError(error).toString();
      throw new Error(errorMessage);
    }

    try {
      const client = await getRedisClient();
      const streamKey = getPostStreamKey(topicId);
      await client.del(streamKey);
      await client.rpush(streamKey, ...stream);
    } catch (error) {
      throw new Error("Redis error");
    }
  } catch (error) {
    console.error(`Failed to process postStream job: ${error}`);
    throw new Error("Failed to process job");
  }
}
