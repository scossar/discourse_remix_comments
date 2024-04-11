import { db } from "./db.server";
import PostCreationError from "./errors/postCreationError";
import type { DiscoursePost, Prisma } from "@prisma/client";
import type { Post, TopicPayload } from "~/types/discourse";
import { getRedisClient } from "./redisClient.server";

export default async function createOrUpdateOp(topicId: number) {
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    throw new PostCreationError(
      "DISCOURSE_BASE_URL and DISCOURSE_API_KEY environment variables not configured on client",
      500
    );
  }
  if (!topicId) {
    throw new PostCreationError(
      "The createOrUpdatePost function was called without a topicId argument",
      500
    );
  }

  const apiKey = process.env.DISCOURSE_API_KEY;
  const baseUrl = process.env.DISCOURSE_BASE_URL;
  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");
  const url = `${baseUrl}/t/-/${topicId}.json`;
  const response = await fetch(url, {
    headers: headers,
  });
  if (!response.ok) {
    throw new PostCreationError(
      "Bad response returned from Discourse when fetching Topic's OP",
      response.status
    );
  }

  const data: TopicPayload = await response.json();
  const post: Post = data.post_stream.posts[0];
  // make sure there are no errors creating the post before saving the stream to redis
  const stream: number[] = data.post_stream.stream;

  const postFields: Prisma.DiscoursePostCreateInput = {
    externalId: post.id,
    username: post.username,
    avatarTemplate: post.avatar_template,
    externalCreatedAt: new Date(post.created_at),
    cooked: post.cooked,
    postNumber: post.post_number,
    postType: post.post_type,
    externalUpdatedAt: post.updated_at,
    replyCount: post.reply_count,
    topic: {
      connect: { externalId: post.topic_id },
    },
    user: {
      connectOrCreate: {
        where: {
          externalId: post.user_id,
        },
        create: {
          externalId: post.user_id,
          username: post.username,
          avatarTemplate: post.avatar_template,
        },
      },
    },
  };

  let discoursePost: DiscoursePost;
  try {
    discoursePost = await db.discoursePost.upsert({
      where: { externalId: post.id },
      update: {
        ...postFields,
      },
      create: {
        ...postFields,
      },
    });
  } catch (error) {
    console.error("There was an error creating the post", error);
    throw new PostCreationError(
      "There was an error inserting the post into the database",
      500
    );
  }

  const streamKey = `postStream:${topicId}`;
  const client = await getRedisClient();
  const stringifiedStream = stream.map(String);
  try {
    await client.rPush(streamKey, stringifiedStream);
  } catch (error) {
    throw new PostCreationError(
      `there was an error writing the postStream ${streamKey} to Redis`,
      500
    );
  }

  return discoursePost;
}
