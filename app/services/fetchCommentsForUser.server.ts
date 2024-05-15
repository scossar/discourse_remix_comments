import FetchCommentsError from "~/services/errors/fetchCommentsError.server";
import { getRedisClient } from "~/services/redisClient.server";
import {
  transformParticipant,
  transformPost,
} from "~/services/transformDiscourseDataZod.server";
import { discourseEnv } from "~/services/config.server";

import {
  type DiscourseApiFullTopicWithPostStream,
  validateDiscourseApiCommentPosts,
  validateDiscourseApiTopicStream,
} from "~/schemas/discourseApiResponse.server";
import type { ParsedDiscourseTopicComments } from "~/types/parsedDiscourse";
import type { Redis } from "ioredis";

const CHUNK_SIZE = 20;

interface FetchContext {
  baseUrl: string;
  headers: Headers;
  client: Redis;
}

export async function fetchCommentsForUser(
  topicId: number,
  currentUsername: string | null,
  page = 0
) {
  const { apiKey, baseUrl } = discourseEnv();

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (currentUsername) {
    headers.append("Api-Key", apiKey);
    headers.append("Api-Username", currentUsername);
  }

  let client;
  try {
    client = await getRedisClient();
  } catch (error) {
    throw new FetchCommentsError("Redis error", 500);
  }

  const context: FetchContext = { baseUrl, headers, client };

  if (page === 0) {
    return await fetchInitialComments(topicId, context);
  } else {
    return await fetchSubsequentComments(topicId, page, context);
  }
}

async function fetchInitialComments(
  topicId: number,
  context: FetchContext
): Promise<ParsedDiscourseTopicComments> {
  const response = await fetch(`${context.baseUrl}/t/-/${topicId}.json`, {
    headers: context.headers,
  });
  if (!response.ok) {
    throw new FetchCommentsError(
      "Failed to fetch initial comments",
      response.status
    );
  }

  const postsData: DiscourseApiFullTopicWithPostStream = await response.json();
  const posts = validateDiscourseApiCommentPosts(postsData?.post_stream?.posts);
  // TODO: an empty array for comments is reasonable, but needs to be handled in the UI
  // an error returning the stream object will trigger the route's errorBoundary.
  let stream;
  try {
    stream = validateDiscourseApiTopicStream(postsData?.post_stream?.stream);
  } catch (error) {
    throw new Error("this error needs to be handled");
  }
  const currentPage = 0;
  const totalPages = Math.ceil(stream.length / CHUNK_SIZE);
  const nextPage = currentPage + 1 < totalPages ? currentPage + 1 : null;
  const previousPage = currentPage - 1 >= 0 ? currentPage - 1 : null;
  const streamKey = `postStream:${topicId}`;
  try {
    await context.client.del(streamKey);
    await context.client.rpush(streamKey, ...stream);
  } catch (error) {
    throw new FetchCommentsError("Redis error", 500);
  }

  return {
    topicId: topicId,
    currentPage: currentPage,
    nextPage: nextPage,
    previousPage: previousPage,
    slug: postsData.slug,
    pagedPosts: {
      [currentPage]: posts.map((post) => transformPost(post, context.baseUrl)),
    },
    details: {
      canCreatePost: postsData.details.can_create_post,
      participants: postsData.details.participants.map((participant) =>
        transformParticipant(participant, context.baseUrl)
      ),
    },
  };
}

async function fetchSubsequentComments(
  topicId: number,
  page: number,
  context: FetchContext
): Promise<ParsedDiscourseTopicComments> {
  const streamKey = `postStream:${topicId}`;
  const chunkSize = CHUNK_SIZE;
  const start: number = page * chunkSize;
  const end: number = start + chunkSize - 1;

  let nextPostIds, stream;
  try {
    stream = await context.client.lrange(streamKey, 0, -1);
    nextPostIds = await context.client.lrange(streamKey, start, end);
  } catch (error) {
    throw new FetchCommentsError("Redis error", 500);
  }
  if (!stream) {
    console.warn(
      // probably make a request to update the stream...
      `This needs to be dealt with, but ideally shouldn't happen unless the Redis key has been dropped.`
    );
  }

  const queryString = "?post_ids[]=" + nextPostIds.join("&post_ids[]=");
  const response = await fetch(
    `${context.baseUrl}/t/${topicId}/posts.json${queryString}`
  );
  if (!response.ok) {
    throw new FetchCommentsError(
      "Failed to fetch subsequent comments",
      response.status
    );
  }
  const postsData: DiscourseApiFullTopicWithPostStream = await response.json();
  const posts = validateDiscourseApiCommentPosts(postsData?.post_stream?.posts);
  // fudging this for now... shouldn't continue if the stream isn't set
  const totalPages = Math.ceil(stream.length / CHUNK_SIZE) || 1;
  const nextPage = page + 1 < totalPages ? page + 1 : null;
  const previousPage = page - 1 >= 0 ? page - 1 : null;

  return {
    topicId: topicId,
    currentPage: page,
    nextPage: nextPage,
    previousPage: previousPage,
    pagedPosts: {
      [page]: posts.map((post) => transformPost(post, context.baseUrl)),
    },
  };
}
