import { db } from "./db.server";
import { discourseEnv } from "~/services/config.server";
import PostCreationError from "./errors/postCreationError.server";
import type { DiscoursePost, Prisma } from "@prisma/client";
import type {
  ApiDiscoursePost,
  ApiDiscourseTopicWithPostStream,
} from "~/types/apiDiscourse";
import { getRedisClient } from "./redisClient.server";
import { generateAvatarUrl } from "./transformDiscourseData.server";

export default async function createOrUpdateOp(topicId: number) {
  if (!topicId) {
    throw new PostCreationError(
      "The createOrUpdatePost function was called without a topicId argument",
      500
    );
  }

  const { apiKey, baseUrl } = discourseEnv();
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

  const data: ApiDiscourseTopicWithPostStream = await response.json();
  const post: ApiDiscoursePost = data.post_stream.posts[0];
  // make sure there are no errors creating the post before saving the stream to redis
  const stream: number[] = data.post_stream.stream;

  const postFields: Prisma.DiscoursePostCreateInput = {
    externalId: post.id,
    username: post.username,
    avatarTemplate: generateAvatarUrl(post.avatar_template, baseUrl),
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
          avatarTemplate: generateAvatarUrl(post.avatar_template, baseUrl),
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
    // delete the key before setting it, otherwise chaos will ensue
    await client.del(streamKey);
    await client.rPush(streamKey, stringifiedStream);
  } catch (error) {
    throw new PostCreationError(
      `there was an error writing the postStream ${streamKey} to Redis`,
      500
    );
  }

  return discoursePost;
}
