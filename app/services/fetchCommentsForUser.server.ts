import FetchCommentsError from "./errors/fetchCommentsError.server";
import { getRedisClient } from "./redisClient.server";

import type {
  ApiDiscourseParticipant,
  ApiDiscoursePost,
  ApiDiscourseTopicWithPostStream,
} from "~/types/apiDiscourse";

import type {
  ParsedDiscourseParticipant,
  ParsedDiscoursePost,
  ParsedDiscourseTopicComments,
  ParsedPagedDiscourseTopic,
} from "~/types/parsedDiscourse";
import * as process from "node:process";
import { RedisClientType, RedisDefaultModules } from "redis";

const CHUNK_SIZE = 20;

function isRegularReplyPost(post: ApiDiscoursePost) {
  return post.post_type === 1 && post.post_number > 1;
}

function generateAvatarUrl(
  avatarTemplate: string,
  discourseBaseUrl: string,
  size = "48"
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${discourseBaseUrl}${sized}`;
}

function transformPost(
  apiPost: ApiDiscoursePost,
  baseUrl: string
): ParsedDiscoursePost {
  return {
    id: apiPost.id,
    username: apiPost.username,
    avatarUrl: generateAvatarUrl(apiPost.avatar_template, baseUrl),
    createdAt: apiPost.created_at,
    cooked: apiPost.cooked,
    postNumber: apiPost.post_number,
    updatedAt: apiPost.updated_at,
    userId: apiPost.user_id,
  };
}

function transformParticipant(
  apiParticipant: ApiDiscourseParticipant,
  baseUrl: string
): ParsedDiscourseParticipant {
  return {
    id: apiParticipant.id,
    username: apiParticipant.username,
    postCount: apiParticipant.post_count,
    avatarUrl: generateAvatarUrl(apiParticipant.avatar_template, baseUrl),
  };
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
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    throw new FetchCommentsError("Env variables not configured", 403);
  }

  const baseUrl = process.env.DISCOURSE_BASE_URL;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (currentUsername) {
    headers.append("Api-Key", process.env.DISCOURSE_API_KEY);
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
  const totalPages = Math.ceil(stream.length / CHUNK_SIZE);
  const streamKey = `postStream:${topicId}`;
  const redisStream = stream.map(String);
  try {
    await context.client.del(streamKey);
    await context.client.rPush(streamKey, redisStream);
  } catch (error) {
    throw new FetchCommentsError("Redis error", 500);
  }

  const parsedTopicComments: ParsedDiscourseTopicComments = {
    topicId: topicId,
    currentPage: 0,
    totalPages: totalPages,
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

  return parsedTopicComments;
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
  // fudging this for now
  const totalPages = Math.ceil(stream.length / CHUNK_SIZE) || 1;

  const parsedDiscourseTopicComments: ParsedDiscourseTopicComments = {
    topicId: topicId,
    currentPage: page,
    totalPages: totalPages,
    posts: postsData.post_stream.posts
      .filter(isRegularReplyPost)
      .map((post) => transformPost(post, context.baseUrl)),
  };

  return parsedDiscourseTopicComments;
}
