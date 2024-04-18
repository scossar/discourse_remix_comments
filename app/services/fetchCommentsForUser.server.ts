import FetchCommentsError from "./errors/fetchCommentsError.server";
import { getRedisClient } from "./redisClient.server";

import type {
  ApiDiscourseParticipant,
  ApiDiscoursePost,
  ApiDiscourseTopicWithPostStream,
} from "~/types/apiDiscourse";

import type {
  ParsedDiscourseTopic,
  ParsedPagedDiscourseTopic,
} from "~/types/parsedDiscourse";

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

export async function fetchCommentsForUser(
  topicId: number,
  slug: string,
  currentUsername: string | null,
  currentPage = 0,
  lastSeenPost: number | null = null
) {
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    throw new FetchCommentsError("Env variables not configured", 403);
  }
  const streamKey = `postStream:${topicId}`;
  console.log(`streamKey: ${streamKey}`);
  const apiKey = process.env.DISCOURSE_API_KEY;
  const baseUrl = process.env.DISCOURSE_BASE_URL;
  const headers = new Headers();
  if (currentUsername) {
    headers.append("Api-Key", apiKey);
    headers.append("Api-Username", currentUsername);
  }
  if (lastSeenPost) {
    let nextPostIds;
    try {
      console.log("there was a last seen poast");
      const chunkSize = CHUNK_SIZE;
      const client = await getRedisClient();
      const nextPage = currentPage + 1;
      const start = nextPage * chunkSize;
      const end = start + chunkSize - 1;
      nextPostIds = await client.lRange(streamKey, start, end);
    } catch (error) {
      throw new FetchCommentsError("Redis error", 500);
    }
    const lastId = Number(nextPostIds[nextPostIds.length - 1]);
    const queryString = "?post_ids[]=" + nextPostIds.join("&post_ids[]=");
    const postsUrl = `${baseUrl}/t/${topicId}/posts.json${queryString}`;
    const postsResponse = await fetch(postsUrl, { headers });
    if (!postsResponse.ok) {
      throw new FetchCommentsError(
        "A bad response was returned from Discourse",
        postsResponse.status
      );
    }

    // todo: validate data
    const postsData: ApiDiscourseTopicWithPostStream =
      await postsResponse.json();
    const postsRequestStreamForUser: ParsedDiscourseTopic = {
      id: postsData.id,
      postStream: {
        posts: postsData.post_stream.posts
          .filter(isRegularReplyPost)
          .map((post: ApiDiscoursePost) => ({
            id: post.id,
            username: post.username,
            avatarUrl: generateAvatarUrl(post.avatar_template, baseUrl),
            createdAt: post.created_at,
            cooked: post.cooked,
            postNumber: post.post_number,
            updatedAt: post.updated_at,
            userId: post.user_id,
          })),
      },
      lastPostId: lastId,
      page: Number(currentPage) + 1,
    };

    return postsRequestStreamForUser;
  }
  console.log("there wasn't a last seen post");

  const topicUrl = `${baseUrl}/t/${slug}/${topicId}.json`;

  const response = await fetch(topicUrl, { headers });
  if (!response.ok) {
    throw new FetchCommentsError(
      "A bad response returned from Discourse",
      response.status
    );
  }

  const data: ApiDiscourseTopicWithPostStream = await response.json();
  // todo: since you've got the stream and the topic id, maybe update
  const stream = data.post_stream.stream;
  const lastPostId = stream[stream.length - 1];
  const postStreamForUser: ParsedDiscourseTopic = {
    id: data.id,
    slug: data.slug,
    postStream: {
      stream: stream,
      posts: data.post_stream.posts
        .filter(isRegularReplyPost)
        .map((post: ApiDiscoursePost) => ({
          id: post.id,
          username: post.username,
          avatarUrl: generateAvatarUrl(post.avatar_template, baseUrl),
          createdAt: post.created_at,
          cooked: post.cooked,
          postNumber: post.post_number,
          updatedAt: post.updated_at,
          userId: post.user_id,
        })),
    },
    details: {
      canCreatePost: data.details.can_create_post,
      participants: data.details.participants.map(
        (participant: ApiDiscourseParticipant) => ({
          id: participant.id,
          username: participant.username,
          postCount: participant.post_count,
          avatarUrl: generateAvatarUrl(participant.avatar_template, baseUrl),
        })
      ),
    },
    lastPostId: lastPostId,
    page: currentPage,
  };

  const comments: ParsedPagedDiscourseTopic = {
    [currentPage]: postStreamForUser,
  };

  return comments;
}
