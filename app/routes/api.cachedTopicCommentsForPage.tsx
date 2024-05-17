import type { LoaderFunctionArgs } from "@remix-run/node";
import { getRedisClient } from "~/services/redisClient.server";
import { getTopicCommentsKey } from "~/services/redisKeys.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const topicId = Number(searchParams?.get("topicId"));
  const page = Number(searchParams?.get("page"));

  try {
    const client = await getRedisClient();
    const cacheKey = getTopicCommentsKey(topicId, page);
    const stringifiedComments = await client.get(cacheKey);
    if (stringifiedComments) {
      return JSON.parse(stringifiedComments);
    }
    return null;
  } catch (error) {
    throw new Error("Redis error");
  }
}
