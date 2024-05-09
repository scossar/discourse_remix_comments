import { json, type ActionFunctionArgs } from "@remix-run/node";

import {
  validateDiscourseApiWebHookPost,
  type DiscourseApiWebHookPost,
} from "~/schemas/discourseApiResponse.server";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ message: "Invalid request method" }, 403);
  }

  const headers = request.headers;
  const discourseHeaders = discourseWehbookHeaders(headers);

  if (
    discourseHeaders["X-Discourse-Event-Type"] !== "post" ||
    (discourseHeaders["X-Discourse-Event"] !== "post_created" &&
      discourseHeaders["X-Discourse-Event"] !== "post_edited")
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

  const webHookData: DiscourseApiWebHookPost = await request.json();

  const result = validateDiscourseApiWebHookPost(webHookData);
  if (!result.success) {
    const errorMessage = result.error.flatten();
    // Todo: this doesn't generate a coherent error message on Discourse.
    return json({ message: errorMessage }, 422);
  }
  const postWebHookJson = result.data;

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];
  // Note: webHookData, not the parsed PostWebHookJson data needs to be passed to the verifySig function.
  const validSig = eventSignature
    ? verifyWebhookRequest(JSON.stringify(webHookData), eventSignature)
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

  // TODO: it's valid, do something with the data, or remove this route if it's not being used.

  return json({ message: "success" }, 200);
};
