import { json, type ActionFunctionArgs } from "@remix-run/node";
import type { ApiDiscourseWebHookHeaders } from "~/types/apiDiscourse";
import { WebHookError } from "~/services/errors/appErrors.server";
import {
  discourseWebHookHeaders,
  verifyWebHookRequest,
} from "~/services/discourseWebHooks.server";
import { validateDiscourseApiWebHookLikePayload } from "~/schemas/discourseApiResponse.server";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";

export const action = async ({ request }: ActionFunctionArgs) => {
  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWebHookHeaders(receivedHeaders);
  let likeWebHookJson;
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    likeWebHookJson = await validateLikeEventWebHook(request, discourseHeaders);
    //  console.log(JSON.stringify(likeWebHookJson, null, 2));

    return json({ message: "success" }, 200);
  } catch (error) {
    let errorMessage = "Unknown validation error";
    let statusCode = 500;
    if (error instanceof WebHookError) {
      errorMessage = error.message;
      statusCode = error.statusCode;
    }
    return json({ message: errorMessage }, statusCode);
  }
};

async function validateLikeEventWebHook(
  request: Request,
  discourseHeaders: ApiDiscourseWebHookHeaders
) {
  if (request.method !== "POST") {
    throw new WebHookError("Invalid request method", 403);
  }
  if (
    discourseHeaders["X-Discourse-Event-Type"] !== "like" ||
    discourseHeaders["X-Discourse-Event"] !== "post_liked"
  ) {
    const errorMessage = `Webhook Error: route not configured to handle ${discourseHeaders["X-Discourse-Event-Type"]} ${discourseHeaders["X-Discourse-Event"]}`;
    throw new WebHookError(errorMessage, 403);
  }

  const webHookJson = await request.json();
  let likeEventJson;
  try {
    likeEventJson = validateDiscourseApiWebHookLikePayload(webHookJson);
  } catch (error) {
    let errorMessage = "Invalid webhook data";
    if (error instanceof ZodError) {
      errorMessage = fromError(error).toString();
    }
    throw new WebHookError(errorMessage, 422);
  }

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];
  const validSig = eventSignature
    ? verifyWebHookRequest(JSON.stringify(webHookJson), eventSignature)
    : false;

  if (!validSig) {
    const errorMessage = `Webhook Error: invalid or missing event signature for event-id ${discourseHeaders["X-Discourse-Event-Id"]} `;
    throw new WebHookError(errorMessage, 403);
  }

  return likeEventJson;
}
