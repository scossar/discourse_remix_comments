import FetchCommentsError from "./errors/fetchCommentsError.server";
import { getRedisClient } from "./redisClient.server";
import {
  transformParticipant,
  transformPost,
} from "./transformDiscourseData.server";
import { discourseEnv } from "./config.server";

import type {
  ApiDiscoursePost,
  ApiDiscourseTopicWithPostStream,
} from "~/types/apiDiscourse";
import type { ParsedDiscourseTopicComments } from "~/types/parsedDiscourse";
import { RedisClientType, RedisDefaultModules } from "redis";

const CHUNK_SIZE = 20;

function isRegularReplyPost(post: ApiDiscoursePost) {
  return post.post_type === 1 && post.post_number > 1;
}

interface FetchContext {
  baseUrl: string;
  headers: Headers;
  client: RedisClientType<RedisDefaultModules>;
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

  const postsData: ApiDiscourseTopicWithPostStream = await response.json();
  const stream = postsData.post_stream.stream;
  const currentPage = 0;
  const totalPages = Math.ceil(stream.length / CHUNK_SIZE);
  const nextPage = currentPage + 1 < totalPages ? currentPage + 1 : null;
  const streamKey = `postStream:${topicId}`;
  const redisStream = stream.map(String);
  try {
    await context.client.del(streamKey);
    await context.client.rPush(streamKey, redisStream);
  } catch (error) {
    throw new FetchCommentsError("Redis error", 500);
  }

  return {
    topicId: topicId,
    nextPage: nextPage,
    slug: postsData.slug,
    posts: postsData.post_stream.posts
      .filter(isRegularReplyPost)
      .map((post) => transformPost(post, context.baseUrl)),
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
    stream = await context.client.lRange(streamKey, 0, -1);
    nextPostIds = await context.client.lRange(streamKey, start, end);
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
  const postsData: ApiDiscourseTopicWithPostStream = await response.json();
  // fudging this for now... shouldn't continue if the stream isn't set
  const totalPages = Math.ceil(stream.length / CHUNK_SIZE) || 1;
  const nextPage = page + 1 < totalPages ? page + 1 : null;

  return {
    topicId: topicId,
    nextPage: nextPage,
    posts: postsData.post_stream.posts
      .filter(isRegularReplyPost)
      .map((post) => transformPost(post, context.baseUrl)),
  };
}
