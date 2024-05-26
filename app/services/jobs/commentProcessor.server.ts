import { transformPost } from "~/services/transformDiscourseDataZod.server";
import { discourseEnv } from "~/services/config.server";
import { type CommentProcessorArgs } from "~/services/jobs/rateLimitedApiWorker.server";
import { getCommentKey } from "~/services/redisKeys.server";
import { getRedisClient } from "~/services/redisClient.server";

export async function commentProcessor({ commentJson }: CommentProcessorArgs) {
  const { baseUrl } = discourseEnv();
  try {
    const tranformedPost = transformPost(commentJson, baseUrl);
    const key = getCommentKey(tranformedPost.topicId, tranformedPost.id);
    console.log(`key: ${key}`);
    const client = await getRedisClient();
    console.log(JSON.stringify(tranformedPost, null, 2));
    await client.set(key, JSON.stringify(tranformedPost));
  } catch (error) {
    // TODO: handle error
    throw new Error();
  }
}
