import { type DiscourseRawEnv, discourseEnv } from "~/services/config.server";
import { ApiError, RedisError, ValidationError } from "~/services/errors/appErrors.server";
import { validateDiscourseApiFullTopicWithPostStream } from "~/schemas/discourseApiResponse.server";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import { getTopicPermissionsKey } from "../redisKeys.server";
import { getRedisClient } from "~/services/redisClient.server";

type TopicPermissions = {
  canComment: "true" | "false";
}

export async function topicPermissionsProcessor(
  topicId: number,
  username: string,
) {
  console.log(`topicid: ${topicId}, username: ${username}`);
  const details = await fetchTopicDetails(topicId, username, discourseEnv());
  const canComment = details?.can_create_post ? "true" : "false";
  const permissions: TopicPermissions = {
    canComment: canComment,
  }
  await setTopicPermissions(topicId, username, permissions);

}

async function fetchTopicDetails(
  topicId: number,
  username: string,
  config: DiscourseRawEnv,
) {
  const { apiKey, baseUrl } = config;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username);
  const url = `${baseUrl}/t/-/${topicId}.json`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new ApiError(`Failed to fetch data from topic route. topicId: ${topicId}`, response.status)
  }

  const json = await response.json();

  let topic;
  try {
    topic = validateDiscourseApiFullTopicWithPostStream(json);
    return topic.details;
  } catch (error) {
    let errorMessage = "Unknown Validation error";
    if (error instanceof ZodError) {
      errorMessage = fromError(error).toString();
      throw new ValidationError(errorMessage);
    }
  }
}

async function setTopicPermissions(topicId: number, username: string, permissions: TopicPermissions) {
  try {
    const client = await getRedisClient();
    await client.set(getTopicPermissionsKey(topicId, username), permissions.canComment);
  } catch (error) {
    throw new RedisError("Unable to set topicPermissions key", 500);
  }
}
