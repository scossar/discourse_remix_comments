import { db } from "./db.server";
//import type { ApiDiscourseBasicTopic } from "~/types/apiDiscourse";
import type { DiscourseApiBasicTopic } from "~/schemas/discourseApiResponse.server";
import TopicCreationError from "./errors/topicCreationError.server";
import { generateAvatarUrl } from "./transformDiscourseDataZod.server";
import { discourseEnv } from "./config.server";
import { DiscourseTopic, Prisma } from "@prisma/client";

export default async function createOrUpdateTopic(
  topicJson: DiscourseApiBasicTopic
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
    console.error("There was an error creating the topic", error);
    throw new TopicCreationError(
      "There was an error inserting the Topic into the database",
      500
    );
  }

  return topic;
}
