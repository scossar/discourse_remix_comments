import { json, type ActionFunctionArgs } from "@remix-run/node";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import { WebHookError } from "~/services/errors/appErrors.server";
import type { ApiDiscourseWebHookHeaders } from "~/types/apiDiscourse";
import { addCommentsMapRequest } from "~/services/jobs/rateLimitedApiWorker.server";

import {
  validateDiscourseApiWebHookPost,
  type DiscourseApiWebHookPost,
} from "~/schemas/discourseApiResponse.server";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWehbookHeaders(receivedHeaders);

  let postWebHookJson;
  try {
    postWebHookJson = await validatePostEventWebHook(request, discourseHeaders);
    if (!postWebHookJson) {
      return json({ message: "Unknown validation error" }, 422);
    }
    // TODO: this is the laziest possible approach, but it works for now
    await addCommentsMapRequest({ topicId: postWebHookJson.post.topic_id });
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

  return json({ message: "success" }, 200);
};

async function validatePostEventWebHook(
  request: Request,
  discourseHeaders: ApiDiscourseWebHookHeaders
) {
  if (request.method !== "POST") {
    throw new WebHookError("Invalid request method", 403);
  }

  if (
    discourseHeaders["X-Discourse-Event-Type"] !== "post" ||
    (discourseHeaders["X-Discourse-Event"] !== "post_created" &&
      discourseHeaders["X-Discourse-Event"] !== "post_edited")
  ) {
    const errorMessage = `Webhook Error: route not configured to handle ${discourseHeaders["X-Discourse-Event-Type"]} ${discourseHeaders["X-Discourse-Event"]}`;
    throw new WebHookError(errorMessage, 403);
  }

  const webHookData: DiscourseApiWebHookPost = await request.json();

  let postWebHookJson;
  try {
    postWebHookJson = validateDiscourseApiWebHookPost(webHookData);
  } catch (error) {
    console.log("a validation error has occurred");
    let errorMessage = "Invalid webhook data";
    if (error instanceof ZodError) {
      errorMessage = fromError(error).toString();
    }
    throw new WebHookError(errorMessage, 422);
  }

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];
  const validSig = eventSignature
    ? verifyWebhookRequest(JSON.stringify(webHookData), eventSignature)
    : false;

  if (!validSig) {
    const errorMessage = `Webhook Error: invalid or missing event signature for event-id ${discourseHeaders["X-Discourse-Event-Id"]} `;
    throw new WebHookError(errorMessage, 403);
  }

  return postWebHookJson;
}
