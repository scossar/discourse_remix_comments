import { db } from "./db.server";
import type { DiscourseAPiWebHookTopic } from "~/schemas/discourseApiResponse.server";
import { PrismaError } from "~/services/errors/appErrors.server";
import { generateAvatarUrl } from "~/services/transformDiscourseDataZod.server";
import { discourseEnv } from "~/services/config.server";
import { DiscourseTopic, Prisma } from "@prisma/client";

export default async function createOrUpdateTopic(
  topicJson: DiscourseAPiWebHookTopic
) {
  const env = discourseEnv();
  const topicFields: Prisma.DiscourseTopicCreateInput = {
    externalId: topicJson.id,
    title: topicJson.title,
    fancyTitle: topicJson.fancy_title,
    postsCount: topicJson.posts_count,
    externalCreatedAt: new Date(topicJson.created_at),
    likeCount: topicJson.like_count,
    lastPostedAt: new Date(topicJson.last_posted_at),
    visible: topicJson.visible,
    closed: topicJson.closed,
    archetype: topicJson.archetype,
    slug: topicJson.slug,
    wordCount: topicJson.word_count,
    user: {
      connectOrCreate: {
        where: {
          externalId: topicJson.user_id,
        },
        create: {
          externalId: topicJson.user_id,
          username: topicJson.created_by.username,
          avatarTemplate: generateAvatarUrl(
            topicJson.created_by.avatar_template,
            env.baseUrl
          ),
        },
      },
    },
    category: {
      connect: { externalId: topicJson.category_id },
    },
  };

  let topic: DiscourseTopic;
  try {
    topic = await db.discourseTopic.upsert({
      where: {
        externalId: topicJson.id,
      },
      update: {
        ...topicFields,
      },
      create: {
        ...topicFields,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Prisma error: ${error.message}`);
      throw new PrismaError(`Prisma error: ${error.message}`, error.code);
    } else if (error instanceof Prisma.PrismaClientValidationError) {
      console.error(`Prisma error: ${error.message}`);
      throw new PrismaError(`Prisma validation error: ${error.message}`);
    } else if (
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      error instanceof Prisma.PrismaClientRustPanicError
    ) {
      console.error(`Prisma error: ${error.message}`);
      throw new PrismaError(`Prisma error: ${error.message}`);
    } else {
      console.error(`Prisma error while attempting to save or update Topic`);
      throw new PrismaError(`Prisma error of unknown type: ${error}`);
    }
  }

  return topic;
}
