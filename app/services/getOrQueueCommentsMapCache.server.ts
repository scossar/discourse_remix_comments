import { getRedisClient } from "~/services/redisClient.server";
import { getCommentsMapKey } from "~/services/redisKeys.server";
import { addCommentsMapRequest } from "~/services/jobs/rateLimitedApiWorker.server";
import RedisError from "~/services/errors/redisError.server";

export async function getOrQueueCommentsMapCache(topicId: number) {
  const cacheKey = getCommentsMapKey(topicId);
  let client;
  try {
    client = await getRedisClient();
  } catch (error) {
    throw new RedisError("Unable to obtain Redis client");
  }

  try {
    const stringifiedCommentsMap = await client.get(cacheKey);
    if (stringifiedCommentsMap) {
      return JSON.parse(stringifiedCommentsMap);
    }
    await addCommentsMapRequest({ topicId });
  } catch (error) {
    throw new RedisError(
      `Error getting commentsMap cache for topicId: ${topicId}`
    );
  }
  return null;
}
