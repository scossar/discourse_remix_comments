import { json, type ActionFunctionArgs } from "@remix-run/node";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import {
  DiscourseApiWebHookTopicPayload,
  validateDiscourseApiWebHookTopicPayload,
} from "~/schemas/discourseApiResponse.server";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks.server";
import type { ApiDiscourseWebhookHeaders } from "~/types/apiDiscourse";
import { addWebHookTopicCategoryRequest } from "~/services/jobs/rateLimitedApiWorker.server";

import { WebHookError } from "~/services/errors/appErrors.server";

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

  const categoryId = topicWebHookJson.topic.category_id;

  // this fires off the process
  await addWebHookTopicCategoryRequest({
    categoryId,
    topicPayload: topicWebHookJson,
    topicEdited: discourseHeaders["X-Discourse-Event"] === "topic-edited",
  });

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
