import { json, type ActionFunctionArgs } from "@remix-run/node";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import { db } from "~/services/db.server";
import {
  DiscourseApiWebHookTopicPayload,
  validateDiscourseApiWebHookTopicPayload,
} from "~/schemas/discourseApiResponse.server";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks.server";
import type { ApiDiscourseWebhookHeaders } from "~/types/apiDiscourse";
import createCategory from "~/services/createCategory.server";
import createOrUpdateTopic from "~/services/createOrUpdateTopic.server";
import createOrUpdateOp from "~/services/createOrUpdateOp.server";
import findOrCreateTags from "~/services/findOrCreateTags.server";
import createTopicTags from "~/services/createTopicTags.server";

import { addWebHookTopicCategoryRequest } from "~/services/jobs/rateLimitedApiWorker.server";

import {
  ApiError,
  ValidationError,
  PrismaError,
  UnknownError,
  WebHookError,
} from "~/services/errors/appErrors.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWehbookHeaders(receivedHeaders);
  let topicWebHookJson;
  try {
    topicWebHookJson = await validateTopicEventWebHook(
      request,
      discourseHeaders
    );
    if (!topicWebHookJson) {
      return json({ message: "Unknown validation error" }, 422);
    }
  } catch (error) {
    let errorMessage = "Invalid webhook request";
    let statusCode = 403;
    if (error instanceof WebHookError) {
      errorMessage = error.message;
      statusCode = error.statusCode;
    }
    console.error(`WebHook error: ${errorMessage}`);
    return json({ message: errorMessage }, statusCode);
  }

  // maybe makes an API request
  const categoryId = topicWebHookJson.topic.category_id;

  await addWebHookTopicCategoryRequest({
    categoryId,
    topicPayload: topicWebHookJson,
    topicEdited: discourseHeaders["X-Discourse-Event"] === "topic-edited",
  });

  /*

  // maybe makes an API request
  let topic;
  try {
    topic = await db.discourseTopic.findUnique({
      where: { externalId: topicJson.id },
    });
    if (!topic || discourseHeaders["X-Discourse-Event"] === "topic_edited") {
      topic = await createOrUpdateTopic(topicJson);
    }
    if (!topic) {
      return json({ message: "Unable to create or update topic" }, 500);
    }
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof PrismaError) {
      errorMessage = error.message;
    }
    console.error(`Prisma error: ${errorMessage}`);
    return json({ message: "Unable to create or update topic" }, 500);
  }

  // maybe makes an API request
  const tagsArray = topicJson?.tags;
  const tagDescriptionsObj = topicJson?.tags_descriptions;
  let topicTagIds;
  if (tagsArray) {
    try {
      topicTagIds = await findOrCreateTags(tagsArray, tagDescriptionsObj);
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof PrismaError) {
        errorMessage = error.message;
      }
      return json({ message: errorMessage }, 500);
    }
  }

  if (topicTagIds) {
    try {
      await createTagTopics(topicTagIds, topic.id);
    } catch (error) {
      let errorMessage = "Unknown error";
      if (error instanceof PrismaError) {
        errorMessage = error.message;
      }
      return json({ message: errorMessage }, 500);
    }
  }

  // maybe makes an API request
  let post;
  try {
    post = await db.discoursePost.findUnique({
      where: { topicId: topic.externalId },
    });
    if (!post) {
      await createOrUpdateOp(topic.externalId);
    }
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof ApiError || error instanceof PrismaError) {
      errorMessage = error.message;
    } else if (error instanceof ZodError) {
      errorMessage = fromError(error).toString();
    }
    console.error(errorMessage);
    return json({ message: errorMessage }, 500);
  } */

  return json({ message: "success" }, 200);
};

async function validateTopicEventWebHook(
  request: Request,
  discourseHeaders: ApiDiscourseWebhookHeaders
) {
  if (request.method !== "POST") {
    throw new WebHookError("Invalid request method", 403);
  }

  if (
    discourseHeaders["X-Discourse-Event-Type"] !== "topic" ||
    (discourseHeaders["X-Discourse-Event"] !== "topic_created" &&
      discourseHeaders["X-Discourse-Event"] !== "topic_edited")
  ) {
    const errorMessage = `Webhook error: route not configured to handle ${discourseHeaders["X-Discourse-Event-Type"]} 
      ${discourseHeaders["X-Discourse-Event"]}`;
    throw new WebHookError(errorMessage, 422);
  }

  const webhookData: DiscourseApiWebHookTopicPayload = await request.json();

  let topicWebHookJson;
  try {
    topicWebHookJson = validateDiscourseApiWebHookTopicPayload(webhookData);
    if (!topicWebHookJson) {
      throw new WebHookError("Invalid webhook data", 422);
    }
  } catch (error) {
    let errorMessage = "Invalid webhook data";
    if (error instanceof ZodError) {
      errorMessage = fromError(error).toString();
    }
    throw new WebHookError(errorMessage, 422);
  }

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];

  const validSig = eventSignature
    ? verifyWebhookRequest(JSON.stringify(webhookData), eventSignature)
    : false;

  if (!validSig) {
    const errorMessage = `Webhook Error: invalid or missing event signature for event-id
    ${discourseHeaders["X-Discourse-Event-Id"]} `;

    throw new WebHookError(errorMessage, 403);
  }

  return topicWebHookJson;
}
