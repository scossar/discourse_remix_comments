import { discourseEnv } from "~/services/config.server";
import { transformPost } from "~/services/transformDiscourseDataZod.server";
import type { ParsedDiscoursePost } from "~/types/parsedDiscourse";
import {
  getCommentKey,
  getCommentReplyKey,
  getPostStreamKey,
} from "~/services/redisKeys.server";
import { getRedisClient } from "~/services/redisClient.server";
import QueueError from "~/services/errors/queueError.server";
import {
  type DiscourseApiTopicPostsOnly,
  validateDiscourseApiCommentPosts,
} from "~/schemas/discourseApiResponse.server";
import type { Redis } from "ioredis";

export async function topicCommentsProcessor(
  topicId: number,
  page: number,
  username?: string
) {
  const chunkSize = 20;
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers({
    "Content-Type": "application/json",
    "Api-Key": apiKey,
    "Api-Username": username || "system",
  });

  let client: Redis;
  try {
    client = await getRedisClient();
  } catch (error) {
    throw new QueueError("Unable to obtain Redis client");
  }

  const start = page * chunkSize;
  const end = start + chunkSize - 1;

  let nextPostIds;
  try {
    const streamKey = getPostStreamKey(topicId);
    nextPostIds = await client.lrange(streamKey, start, end);
  } catch (error) {
    throw new QueueError("Error obtaining post stream for page");
  }

  if (nextPostIds.length === 0) {
    throw new QueueError(`No post ids were found for page ${page}`);
  }

  const queryString = "?post_ids[]=" + nextPostIds.join("&post_ids[]=");
  const response = await fetch(
    `${baseUrl}/t/${topicId}/posts.json${queryString}`,
    { headers }
  );

  if (!response.ok) {
    throw new QueueError(
      "Failed to fetch subsequent comments",
      response.status
    );
  }

  const json: DiscourseApiTopicPostsOnly = await response.json();
  const posts = validateDiscourseApiCommentPosts(json.post_stream.posts);
  const transformedPosts: ParsedDiscoursePost[] = posts.map((post) =>
    transformPost(post, baseUrl)
  );

  try {
    await cachePosts(transformedPosts, client);
  } catch (error) {
    throw new QueueError("Failed to cache posts");
  }
}

async function cachePost(post: ParsedDiscoursePost, client: Redis) {
  if (post.replyToPostNumber) {
    await client.sadd(
      getCommentReplyKey(post.topicId, post.replyToPostNumber),
      post.id
    );
  }
  await client.set(getCommentKey(post.topicId, post.id), JSON.stringify(post));
}

async function cachePosts(posts: ParsedDiscoursePost[], client: Redis) {
  await Promise.all(posts.map((post) => cachePost(post, client)));
}
