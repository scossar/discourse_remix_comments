import { db } from "~/services/prisma/db.server";
import createOrUpdateTopic from "~/services/prisma/createOrUpdateTopic.server";
import findOrCreateTags from "~/services/prisma/findOrCreateTags.server";
import createTopicTags from "~/services/prisma/createTopicTags.server";
import type { DiscourseApiWebHookTopicPayload } from "~/schemas/discourseApiResponse.server";
import { JobError, PrismaError } from "~/services/errors/appErrors.server";

export async function webHookTopicProcessor(
  topicWebHookJson: DiscourseApiWebHookTopicPayload,
  topicEdited: boolean
) {
  let topic;
  try {
    topic = await findOrCreateTopic(topicWebHookJson, topicEdited);
    if (!topic) {
      throw new JobError("Unable to find or create topic for webhook payload");
    }
    if (topicWebHookJson.topic?.tags) {
      const tagNames = topicWebHookJson.topic?.tags;
      const tagsDescriptions = topicWebHookJson.topic?.tags_descriptions;
      await handleTopicTags(topic.id, tagNames, tagsDescriptions);
    }

    return topic;
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof PrismaError) {
      errorMessage = error.message;
    }
    throw new JobError(errorMessage, 500);
  }
}

async function findOrCreateTopic(
  topicWebHookJson: DiscourseApiWebHookTopicPayload,
  topicEdited: boolean
) {
  let topic;
  try {
    topic = await db.discourseTopic.findUnique({
      where: { externalId: topicWebHookJson.topic.id },
    });
    if (!topic || topicEdited) {
      topic = await createOrUpdateTopic(topicWebHookJson.topic);
    }

    return topic;
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof PrismaError) {
      errorMessage = error.message;
    }
    throw new JobError(errorMessage, 500);
  }
}

async function handleTopicTags(
  topicDatabaseId: number,
  tagNames: string[],
  tagDescriptions: Record<string, string>
) {
  let topicTagIds;
  try {
    topicTagIds = await findOrCreateTags(tagNames, tagDescriptions);
    if (topicTagIds) {
      await createTopicTags(topicTagIds, topicDatabaseId);
    }
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof PrismaError) {
      errorMessage = error.message;
    }
    throw new PrismaError(errorMessage);
  }
}
