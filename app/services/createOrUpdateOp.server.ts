import { db } from "~/services/db.server";
import { type DiscourseRawEnv, discourseEnv } from "~/services/config.server";
import { ApiError, PrismaError } from "~/services/errors/appErrors.server";
import { ZodError } from "zod";
import type { Prisma } from "@prisma/client";
import { throwPrismaError } from "~/services/errors/handlePrismaError.server";
import {
  type DiscourseApiFullTopicWithPostStream,
  type DiscourseApiBasicPost,
  validateDiscourseApiBasicPost,
} from "~/schemas/discourseApiResponse.server";
import { generateAvatarUrl } from "~/services/transformDiscourseDataZod.server";

export default async function createOrUpdateOp(topicId: number) {
  try {
    const topicJson = await fetchTopic(topicId, discourseEnv());
    const post = validateDiscourseApiBasicPost(
      topicJson?.post_stream?.posts[0]
    );
    await savePost(post, discourseEnv());
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Api Error: ${error.message}`);
      throw error;
    } else if (error instanceof PrismaError) {
      console.error(`Prisma error: ${error.message}`);
      throw error;
    } else if (error instanceof ZodError) {
      console.error(`Zod validation error: ${error}`);
      throw error;
    } else {
      console.error(
        "Unknown error occurred when attempting to fetch or create the post"
      );
      throw error;
    }
  }
}

async function fetchTopic(
  topicId: number,
  config: DiscourseRawEnv
): Promise<DiscourseApiFullTopicWithPostStream> {
  const { apiKey, baseUrl } = config;
  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");
  const url = `${baseUrl}/t/-/${topicId}.json`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new ApiError(
      "Bad response returned from Discourse when fetching Topic's OP",
      response.status
    );
  }

  return await response.json();
}

async function savePost(post: DiscourseApiBasicPost, config: DiscourseRawEnv) {
  const { baseUrl } = config;
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

  try {
    await db.discoursePost.upsert({
      where: { externalId: post.id },
      update: {
        ...postFields,
      },
      create: {
        ...postFields,
      },
    });
  } catch (error) {
    throwPrismaError(error);
  }
}
