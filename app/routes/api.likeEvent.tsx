import { type ActionFunctionArgs } from "@remix-run/node";
import type { ApiDiscourseWebHookHeaders } from "~/types/apiDiscourse";
import { WebHookError } from "~/services/errors/appErrors.server";
import { discourseWebHookHeaders } from "~/services/discourseWebHooks.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWebHookHeaders(receivedHeaders);
  let likeWebHookJson;
  try {
    likeWebHookJson = validateLikeEventWebHook(request, discourseHeaders);
  } catch (error) {
    const errorMessage = "Unknown validation error";
  }
};

async function validateLikeEventWebHook(
  request: Request,
  discourseHeaders: ApiDiscourseWebHookHeaders
) {
  if (request.method == "POST") {
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
}
