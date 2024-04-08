import { json, type ActionFunctionArgs } from "@remix-run/node";

import { db } from "~/services/db.server";
import type { Post, WebHookPost } from "~/types/discourse";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks";
import createPost from "~/services/createPost";
import PostCreationError from "~/services/errors/postCreationError";

function isValidPostWebhookData(data: WebHookPost): data is WebHookPost {
  return (
    typeof data.post.id === "number" &&
    typeof data.post.cooked === "string" &&
    typeof data.post.post_number === "number"
  );
}

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

  const webhookJson: WebHookPost = await request.json();
  if (!isValidPostWebhookData(webhookJson)) {
    return json(
      {
        message: "The payload is not valid webhook data",
      },
      400
    );
  }

  const postJson: Post = webhookJson.post;

  // return now if it's not the OP
  if (postJson.post_number !== 1) {
    return json(
      {
        message:
          "No post created. The payload URL is only configured to create posts for post_number 1.",
      },
      200
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

  const topic = await db.discourseTopic.findUnique({
    where: { externalId: postJson.topic_id },
  });

  if (!topic) {
    return json(
      {
        message: `The associated topic does not exist for post. Post Id: ${postJson.id}`,
      },
      403
    );
  }

  let post = await db.discoursePost.findUnique({
    where: { externalId: postJson.id },
  });

  if (!post || discourseHeaders["X-Discourse-Event"] !== "post_edited") {
    try {
      post = await createPost(postJson);
    } catch (error) {
      if (error instanceof PostCreationError) {
        return json({ message: error.message }, error.statusCode);
      }
      return json({ message: "An unexpected error occurred" }, 500);
    }
  }

  return json({ message: "success" }, 200);
};
