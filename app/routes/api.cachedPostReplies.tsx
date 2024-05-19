import type { LoaderFunctionArgs } from "@remix-run/node";
import { getRedisClient } from "~/services/redisClient.server";
import { getPostRepliesKey } from "~/services/redisKeys.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const postId = Number(searchParams.get("postId")) || null;

  if (!postId) {
    throw new Error("Missing required postId param");
  }

  let client;
  try {
    client = await getRedisClient();
    const stringifiedPostReplies = await client.get(getPostRepliesKey(postId));
    if (stringifiedPostReplies) {
      console.log(`returned cached reply posts for postId: ${postId}`);
      return JSON.parse(stringifiedPostReplies);
    }
    // TODO: queue the postReplies processor
    return null;
  } catch (error) {
    throw new Error(`Unable to set postRepliesKey for postId: ${postId}`);
  }
}
