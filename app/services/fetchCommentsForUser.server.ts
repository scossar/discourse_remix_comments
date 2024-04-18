import FetchCommentsError from "./errors/fetchCommentsError.server";
import {getRedisClient} from "./redisClient.server";

import type {
  ApiDiscourseParticipant,
  ApiDiscoursePost,
  ApiDiscourseTopicWithPostStream,
} from "~/types/apiDiscourse";

import type {
  ParsedDiscourseParticipant,
  ParsedDiscoursePost,
  ParsedPagedDiscourseTopic,
} from "~/types/parsedDiscourse";
import * as process from "node:process";
import {RedisClientType, RedisDefaultModules} from "redis";

const CHUNK_SIZE = 20;

function isRegularReplyPost(post: ApiDiscoursePost) {
  return post.post_type === 1 && post.post_number > 1;
}

function generateAvatarUrl(
  avatarTemplate: string,
  discourseBaseUrl: string,
  size = "48",
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${discourseBaseUrl}${sized}`;
}

function transformPost(apiPost: ApiDiscoursePost, baseUrl: string): ParsedDiscoursePost {
  return {
    id: apiPost.id,
    username: apiPost.username,
    avatarUrl: generateAvatarUrl(apiPost.avatar_template, baseUrl),
    createdAt: apiPost.created_at,
    cooked: apiPost.cooked,
    postNumber: apiPost.post_number,
    updatedAt: apiPost.updated_at,
    userId: apiPost.user_id,
  }
}

function transformParticipant(apiParticipant: ApiDiscourseParticipant, baseUrl: string): ParsedDiscourseParticipant {
  return {
    id: apiParticipant.id,
    username: apiParticipant.username,
    postCount: apiParticipant.post_count,
    avatarUrl: generateAvatarUrl(apiParticipant.avatar_template, baseUrl),
  }
}

export async function fetchCommentsForUser(
  topicId: number,
  slug: string,
  currentUsername: string | null,
  currentPage = 0,
  lastSeenPost: number | null = null,
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

  if (currentPage === 0) {
    return await fetchInitialComments(topicId, slug, currentUsername, baseUrl, headers);
  } else {
    return await fetchSubsequentComments(topicId, currentPage, lastSeenPost, baseUrl, headers, client)
  }
}

async function fetchInitialComments(topicId: number, slug: string, currentUsername: string | null, baseUrl: string, headers: Headers): Promise<ParsedPagedDiscourseTopic> {
  const topicUrl = `${baseUrl}/t/${slug}/${topicId}.json`;
  const response = await fetch(topicUrl, {headers});
  if (!response.ok) {
    throw new FetchCommentsError("Failed to fetch initial comments", response.status);
  }

  const postsData: ApiDiscourseTopicWithPostStream = await response.json();
  const stream = postsData.post_stream.stream;
  const lastPostId = stream[stream.length - 1];

  return {
    [0]: {
      id: postsData.id,
      slug: postsData.slug,
      postStream: {
        stream: stream,
        posts: postsData.post_stream.posts.filter(isRegularReplyPost).map(post => transformPost(post, baseUrl)),
      },
      details: {
        canCreatePost: postsData.details.can_create_post,
        participants: postsData.details.participants.map(participant => transformParticipant(participant, baseUrl)),
      },
      lastPostId: lastPostId,
      page: 0,
    },
  } as ParsedPagedDiscourseTopic; // Type assertion here
}

async function fetchSubsequentComments(topicId: number, currentPage: number, lastSeenPost: number | null, baseUrl: string, headers: Headers, client: RedisClientType<RedisDefaultModules>): Promise<ParsedPagedDiscourseTopic> {
  const chunkSize = CHUNK_SIZE;
  const nextPage = currentPage + 1;
  const start: number = nextPage * chunkSize;
  const end: number = start + chunkSize - 1;
  let nextPostIds;
  try {
    nextPostIds = await client.lRange(`postStream:${topicId}`, start, end);
  } catch (error) {
    throw new FetchCommentsError("Redis error", 500);
  }
  const queryString = "?post_ids[]=" + nextPostIds.join("&post_ids[]=");
  const postsUrl = `${baseUrl}/t/${topicId}/posts.json${queryString}`;
  const response = await fetch(postsUrl, {headers});
  if (!response.ok) {
    throw new FetchCommentsError("Failed to fetch subsequent comments", response.status)
  }
  const postsData: ApiDiscourseTopicWithPostStream = await response.json();
  const lastId = Number(nextPostIds[nextPostIds.length - 1]);
  return {
    [nextPage]: {
      id: postsData.id,
      postStream: {
        posts: postsData.post_stream.posts.filter(isRegularReplyPost).map(post => transformPost(post, baseUrl)),
      },
      lastPostId: lastId,
      page: Number(nextPage),
    },
  } as ParsedPagedDiscourseTopic;

}
