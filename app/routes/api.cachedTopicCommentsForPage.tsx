import type { LoaderFunctionArgs } from "@remix-run/node";
import { getRedisClient } from "~/services/redisClient.server";
import { getTopicCommentsKey } from "~/services/redisKeys.server";
import RedisError from "~/services/errors/redisError.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const topicId = Number(searchParams?.get("topicId"));
  const page = Number(searchParams?.get("page"));

  try {
    const client = await getRedisClient();
    const cacheKey = getTopicCommentsKey(topicId, page);
    const stringifiedComments = await client.get(cacheKey);
    if (stringifiedComments) {
      console.log(
        `getting cached comments for topicId: ${topicId}, page: ${page}`
      );

      console.log(JSON.parse(stringifiedComments));
      return JSON.parse(stringifiedComments);
    }
    return null;
  } catch (error) {
    throw new RedisError(
      `Error returning topicComments for topicId: ${topicId}, page: ${page}`
    );
  }
}
