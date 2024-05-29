import { discourseEnv } from "~/services/config.server";
import QueueError from "~/services/errors/queueError.server";
import { validateDiscourseApiReplyPosts } from "~/schemas/discourseApiResponse.server";
import { getRedisClient } from "~/services/redis/redisClient.server";
import { getPostRepliesKey } from "~/services/redis/redisKeys.server";
import type { ParsedDiscourseCommentReplies } from "~/types/parsedDiscourse";
import { transformReplyPost } from "../transformDiscourseData.server";

export async function commentRepliesProcessor(
  postId: number,
  username?: string
) {
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username ? username : "system");

  const url = `${baseUrl}/posts/${postId}/replies.json`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new QueueError(
      "Unable to fetch replies from Discourse",
      response.status
    );
  }

  const json = await response.json();
  const validReplyPosts = validateDiscourseApiReplyPosts(json);

  const postReplies: ParsedDiscourseCommentReplies = {
    repliesForPostId: postId,
    posts: validReplyPosts.map((post) => transformReplyPost(post, baseUrl)),
  };

  const stringifiedReplyPosts = JSON.stringify(postReplies);

  let client;
  try {
    client = await getRedisClient();
    await client.set(getPostRepliesKey(postId), stringifiedReplyPosts);
  } catch (error) {
    throw new QueueError(`Unable to set postReplies for postId: ${postId}`);
  }

  return stringifiedReplyPosts;
}
