import { db } from "./db.server";
import type { Post } from "~/types/discourse";
import PostCreationError from "./errors/postCreationError";
import { Prisma } from "@prisma/client";

export default async function createPost(postJson: Post) {
  const postFields: Prisma.DiscoursePostCreateInput = {
    externalId: postJson.id,
    username: postJson.username,
    avatarTemplate: postJson.avatar_template,
    externalCreatedAt: new Date(postJson.created_at),
    cooked: postJson.cooked,
    postNumber: postJson.post_number,
    postType: postJson.post_type,
    externalUpdatedAt: postJson.updated_at,
    replyCount: postJson.reply_count,
    replyToPostNumber: postJson.reply_to_post_number,
    categoryId: postJson?.category_id,
    raw: postJson.raw,
    user: {
      connectOrCreate: {
        where: {
          externalId: postJson.user_id,
        },
        create: {
          externalId: postJson.user_id,
          username: postJson.username,
          avatarTemplate: postJson.avatar_template,
        },
      },
    },
    topic: {
      connect: { externalId: postJson.topic_id },
    },
  };

  let post;
  try {
    post = await db.discoursePost.upsert({
      where: {
        externalId: postJson.id,
      },
      update: {
        ...postFields,
      },
      create: {
        ...postFields,
      },
    });
  } catch (error) {
    console.error("There was an error creating the post", error);
    throw new PostCreationError("There was an error creating the post", 500);
  }

  return post;
}
