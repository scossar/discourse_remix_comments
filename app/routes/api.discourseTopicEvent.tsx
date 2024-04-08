import { json, type ActionFunctionArgs } from "@remix-run/node";

import { db } from "~/services/db.server";
import { Prisma } from "@prisma/client";
import type { DiscourseTopic } from "@prisma/client";

import type { WebHookTopic } from "~/types/discourse";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks";
import createCategory from "~/services/createCategory";
import createOrUpdateTopic from "~/services/createOrUpdateTopic";
import findOrCreateTags from "~/services/findOrCreateTags";
import createTagTopics from "~/services/createTagTopics";
import CategoryCreationError from "~/services/errors/categoryCreationError";
import TagCreationError from "~/services/errors/tagCreationError";
import TopicCreationError from "~/services/errors/topicCreationError";
// todo: improve or remove
function isValidTopicWebHookData(data: WebHookTopic): data is WebHookTopic {
  return typeof data?.topic?.id === "number";
}

// todo: add upsert handling for topic_edited; move to services directory
async function createTopicWithTags(
  topicData: Prisma.DiscourseTopicCreateInput,
  foundOrCreatedTagIds?: number[]
) {
  let topic: DiscourseTopic;
  try {
    topic = await db.discourseTopic.create({
      data: topicData,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("Topic already exists");
      throw new TopicCreationError(
        "Topic creation failed due to unique key violation",
        500
      );
    } else {
      console.error("An unexpected error occurred:", error);
      throw new TopicCreationError(
        "An unexpected error occurred during topic creation",
        500
      );
    }
  }

  if (topic && foundOrCreatedTagIds) {
    const topicTagCreations = foundOrCreatedTagIds.map((tagId) =>
      db.discourseTopicTag.create({
        data: {
          tagId: tagId,
          topicId: topic.id,
        },
      })
    );

    await Promise.all(topicTagCreations);
  }

  return topic;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ message: "Invalid request method" }, 403);
  }

  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWehbookHeaders(receivedHeaders);

  if (
    discourseHeaders["X-Discourse-Event-Type"] !== "topic" ||
    (discourseHeaders["X-Discourse-Event"] !== "topic_created" &&
      discourseHeaders["X-Discourse-Event"] !== "topic_edited")
  ) {
    console.warn(
      `Webhook Error: route not configured to handle ${discourseHeaders["X-Discourse-Event-Type"]} ${discourseHeaders["X-Discourse-Event"]}`
    );
    return json(
      {
        message: `Payload URL not configured to handle ${discourseHeaders["X-Discourse-Event-Id"]} event`,
      },
      403
    );
  }

  const webhookJson: WebHookTopic = await request.json();

  if (!isValidTopicWebHookData(webhookJson)) {
    return json(
      {
        message: "The payload is not valid Topic WebHook data",
      },
      400
    );
  }

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];

  const validSig = eventSignature
    ? verifyWebhookRequest(JSON.stringify(webhookJson), eventSignature)
    : false;

  if (!validSig) {
    console.warn(
      `Webhook Error: invalid or missing event signature for event-id ${discourseHeaders["X-Discourse-Event-Id"]} `
    );
    return json(
      {
        message: `Payload Signature mismatch`,
      },
      403
    );
  }

  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    console.warn(
      "Webhook Error: DISCOURSE_BASE_URL environmental variable not set"
    );
    return json(
      {
        message: "Webhook environmental variables not configured on client",
      },
      500
    );
  }

  const topicJson = webhookJson.topic;

  // "personal_message" archetypes don't have a category, so confirm before trying to get the topic's category:
  const categoryId = topicJson?.category_id;
  if (categoryId) {
    let category = await db.discourseCategory.findUnique({
      where: { externalId: categoryId },
    });
    if (!category) {
      try {
        category = await createCategory(categoryId);
      } catch (error) {
        if (error instanceof CategoryCreationError) {
          return json({ message: error.message }, error.statusCode);
        }
        return json({ message: "An unexpected error occurred" }, 500);
      }
    }
  }

  let topic = await db.discourseTopic.findUnique({
    where: { externalId: topicJson.id },
  });

  if (!topic || discourseHeaders["X-Discourse-Event"] !== "topic_edited") {
    try {
      topic = await createOrUpdateTopic(topicJson);
    } catch (error) {
      if (error instanceof TopicCreationError) {
        return json({ message: error.message }, error.statusCode);
      }
      return json({ message: "An unexpected error occurred" }, 500);
    }
  }

  const tagsArray = topicJson?.tags;
  const tagDescriptionsObj = topicJson?.tags_descriptions;

  let topicTagIds;
  if (tagsArray) {
    try {
      topicTagIds = await findOrCreateTags(tagsArray, tagDescriptionsObj);
    } catch (error) {
      if (error instanceof TagCreationError) {
        return json({ message: error.message }, error.statusCode);
      }
      return json({ message: "An unexpected error occurred" }, 500);
    }
  }

  let tagTopics;
  if (topicTagIds) {
    try {
      tagTopics = await createTagTopics(topicTagIds, topic.id);
    } catch (error) {
      if (error instanceof TagCreationError) {
        return json({ message: error.message }, error.statusCode);
      }
      return json({ message: "An unexpected error occurred" }, 500);
    }
  }
  return json({ message: "success" }, 200);
};
