import type { LoaderFunctionArgs } from "@remix-run/node";
import { getRedisClient } from "~/services/redisClient.server";
import type {
  ParsedDiscourseCommentReplies,
  ParsedDiscoursePost,
} from "~/types/parsedDiscourse";
import { getCommentKey, getCommentReplyKey } from "~/services/redisKeys.server";
import type { Redis } from "ioredis";

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const topicId = Number(searchParams.get("topicId")) || null;
  const postId = Number(searchParams.get("postId")) || null;
  const postNumber = Number(searchParams.get("postNumber")) || null;

  if (!topicId || !postId || !postNumber) {
    throw new Error("Missing required params");
  }

  try {
    const client = await getRedisClient();
    const replyPostIds = await client.smembers(
      getCommentReplyKey(topicId, postNumber)
    );
    const sortedReplyPostIds = replyPostIds.map(Number).sort((a, b) => a - b);

    console.log(`replyPostIds: ${replyPostIds}`);

    const promises = sortedReplyPostIds.map((postId) =>
      getCachedComment(topicId, postId, client)
    );
    const comments = await Promise.all(promises);
    const filteredComments = comments.filter(
      (comment): comment is ParsedDiscoursePost => comment !== null
    );

    const commentReplies: ParsedDiscourseCommentReplies = {
      repliesForPostId: postId,
      posts: filteredComments,
    };

    return null;
  } catch (error) {
    throw new Error(
      `Unable to get reply posts for topicId: ${topicId}, postNumber: ${postNumber}`
    );
  }
}

async function getCachedComment(
  topicId: number,
  postId: number,
  client: Redis
): Promise<ParsedDiscoursePost | null> {
  const stringifiedComment = await client.get(getCommentKey(topicId, postId));
  if (stringifiedComment) {
    return JSON.parse(stringifiedComment);
  }

  return null;
}
