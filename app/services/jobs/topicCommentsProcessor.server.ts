import { discourseEnv } from "~/services/config.server";
import {
  getPostStreamKey,
  getTopicCommentsKey,
} from "~/services/redisKeys.server";
import { getRedisClient } from "~/services/redisClient.server";
import QueueError from "~/services/errors/queueError.server";
import {
  type DiscourseApiTopicPostsOnly,
  validateDiscourseApiCommentPosts,
} from "~/schemas/discourseApiResponse.server";
import type { ParsedDiscourseTopicComments } from "~/types/parsedDiscourse";
import { transformPost } from "~/services/transformDiscourseDataZod.server";

// TODO: maybe handle first page differently?
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

  let client;
  try {
    client = await getRedisClient();
  } catch (error) {
    throw new QueueError("Unable to obtain Redis client");
  }

  const start = page * chunkSize;
  const end = start + chunkSize - 1;
  let nextPostIds, streamLength;
  try {
    const streamKey = getPostStreamKey(topicId);
    nextPostIds = await client.lrange(streamKey, start, end);
    streamLength = await client.llen(streamKey);
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
  // note: if there are no valid posts, an empty array will be returned
  const posts = validateDiscourseApiCommentPosts(json.post_stream.posts);
  const totalPages = Math.ceil(streamLength / chunkSize);
  const nextPage = page + 1 < totalPages ? page + 1 : null;
  const previousPage = page - 1 >= 0 ? page - 1 : null;

  const parsedTopicComments: ParsedDiscourseTopicComments = {
    topicId: topicId,
    currentPage: page,
    nextPage: nextPage,
    previousPage: previousPage,
    pagedPosts: {
      [page]: posts.map((post) => transformPost(post, baseUrl)),
    },
  };

  try {
    await client.set(
      getTopicCommentsKey(topicId, page),
      JSON.stringify(parsedTopicComments)
    );
  } catch (error) {
    throw new QueueError(
      `Unable to set Redis key for topicId: ${topicId}, page: ${page}`
    );
  }
}
