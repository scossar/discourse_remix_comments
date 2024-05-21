import { db } from "~/services/db.server";
import createOrUpdateTopic from "~/services/createOrUpdateTopic.server";
import type { DiscourseApiWebHookTopicPayload } from "~/schemas/discourseApiResponse.server";
import { JobError, PrismaError } from "~/services/errors/appErrors.server";

export async function webHookTopicProcessor(
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
    if (!topic) {
      throw new JobError(
        `Topic could not be created for topic.externalId: ${topicWebHookJson.topic.id}`
      );
    }

    return { topic, payload: topicWebHookJson };
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof PrismaError) {
      errorMessage = error.message;
    }
    throw new JobError(errorMessage, 500);
  }
}
