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
import createCategory from "~/services/createCategory.server";
import createOrUpdateTopic from "~/services/createOrUpdateTopic.server";
import createOrUpdateOp from "~/services/createOrUpdateOp.server";
import findOrCreateTags from "~/services/findOrCreateTags.server";
import createTagTopics from "~/services/createTagTopics.server";
import {
  ApiError,
  ValidationError,
  PrismaError,
  UnknownError,
  WebHookError,
} from "~/services/errors/appErrors.server";

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

  const webhookData: DiscourseApiWebHookTopicPayload = await request.json();

  let topicWebHookJson;
  try {
    topicWebHookJson = validateDiscourseApiWebHookTopicPayload(webhookData);
  } catch (error) {
    return json({ message: fromError(error).toString() }, 422);
  }

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];

  const validSig = eventSignature
    ? verifyWebhookRequest(JSON.stringify(webhookData), eventSignature)
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

  const topicJson = topicWebHookJson.topic;

  // maybe makes an API request
  const categoryId = topicJson?.category_id;
  if (categoryId) {
    const category = await db.discourseCategory.findUnique({
      where: { externalId: categoryId },
    });
    if (!category) {
      try {
        await createCategory(categoryId);
      } catch (error) {
        let errorMessage;
        if (
          error instanceof ApiError ||
          error instanceof ValidationError ||
          error instanceof PrismaError ||
          error instanceof UnknownError
        ) {
          errorMessage = error.message;
        } else {
          errorMessage = "Unknown error";
        }
        console.error(`Error creating category: ${errorMessage}`);
        return json({ message: errorMessage }, 500);
      }
    }
  }

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
  }

  return json({ message: "success" }, 200);
};

async function validateTopicEventWebhook({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    throw new WebHookError("Invalid request method", 403);
  }

  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWehbookHeaders(receivedHeaders);

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

  return topicWebHookJson.topic;
}
