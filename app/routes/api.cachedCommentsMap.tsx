import type { LoaderFunctionArgs } from "@remix-run/node";
import { getRedisClient } from "~/services/redisClient.server";
import { getCommentsMapKey } from "~/services/redisKeys.server";
import RedisError from "~/services/errors/redisError.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const topicId = Number(searchParams?.get("topicId"));
  const cacheKey = getCommentsMapKey(topicId);
  try {
    const client = await getRedisClient();
    const stringifiedCommentsMap = await client.get(cacheKey);
    if (stringifiedCommentsMap) {
      return JSON.parse(stringifiedCommentsMap);
    }
    return null;
  } catch (error) {
    throw new RedisError(`Error returning commentsMap for topicId: ${topicId}`);
  }
}
