import { discourseEnv } from "~/services/config.server";
import { transformPost } from "~/services/transformDiscourseDataZod.server";
import type { ParsedDiscoursePost } from "~/types/parsedDiscourse";
import { getPostStreamKey } from "~/services/redisKeys.server";
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
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username || "system");

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
    `${baseUrl}/t/${topicId}/posts.json${queryString}`
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

  await cachePosts(transformedPosts, client);

  /*
  await Promise.all(
    posts.map((post) => addCommentRequest({ commentJson: post }))
  );
  */
}

async function cachePosts(posts: ParsedDiscoursePost[], client: Redis) {
  console.log(
    `posts: ${JSON.stringify(posts, null, 2)}, Redis type: ${typeof client}`
  );
}
