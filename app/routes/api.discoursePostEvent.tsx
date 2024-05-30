import { json, type ActionFunctionArgs } from "@remix-run/node";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";
import { WebHookError } from "~/services/errors/appErrors.server";
import type { ApiDiscourseWebHookHeaders } from "~/types/apiDiscourse";
import {
  validateDiscourseApiCommentPost,
  type DiscourseApiWebHookPost,
} from "~/schemas/discourseApiResponse.server";
import {
  discourseWebHookHeaders,
  verifyWebHookRequest,
} from "~/services/discourseWebHooks.server";
import { transformPost } from "~/services/transformDiscourseData.server";
import {
  getCommentKey,
  getPostStreamKey,
} from "~/services/redis/redisKeys.server";
import { discourseEnv } from "~/services/config.server";
import { getRedisClient } from "~/services/redis/redisClient.server";
import { confirmTopicExists } from "~/services/prisma/confirmTopicExists.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { baseUrl } = discourseEnv();
  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWebHookHeaders(receivedHeaders);

  let postWebHookJson;
  try {
    postWebHookJson = await validatePostEventWebHook(request, discourseHeaders);
    if (!postWebHookJson) {
      return json({ message: "Unknown validation error" }, 422);
    }

    const topicExists = await confirmTopicExists(postWebHookJson.topic_id);
    if (!topicExists) {
      return json(
        {
          message: `Topic with id ${postWebHookJson.topic_id} does not exist on the site`,
        },
        422
      );
    }

    const client = await getRedisClient();

    if (discourseHeaders["X-Discourse-Event"] === "post_destroyed") {
      await client.del(
        getCommentKey(postWebHookJson.topic_id, postWebHookJson.id)
      );
      await client.srem(
        getPostStreamKey(postWebHookJson.topic_id),
        postWebHookJson.id
      );

      return json({ message: "success" }, 200);
    }

    const parsedPost = transformPost(postWebHookJson, baseUrl);
    await client.set(
      getCommentKey(parsedPost.topicId, parsedPost.id),
      JSON.stringify(parsedPost)
    );

    await client.sadd(getPostStreamKey(parsedPost.topicId), parsedPost.id);
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

  const eventType = discourseHeaders["X-Discourse-Event-Type"];
  const event = discourseHeaders["X-Discourse-Event"];

  if (
    eventType !== "post" ||
    (event !== "post_created" &&
      event !== "post_edited" &&
      event !== "post_destroyed")
  ) {
    const errorMessage = `Webhook Error: route not configured to handle ${eventType} ${event}`;
    throw new WebHookError(errorMessage, 403);
  }

  const webHookData: DiscourseApiWebHookPost = await request.json();

  let postWebHookJson;
  try {
    postWebHookJson = validateDiscourseApiCommentPost(webHookData.post);
  } catch (error) {
    let errorMessage = "Invalid webhook data";
    if (error instanceof ZodError) {
      errorMessage = fromError(error).toString();
    }
    throw new WebHookError(errorMessage, 422);
  }

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];
  const validSig = eventSignature
    ? verifyWebHookRequest(JSON.stringify(webHookData), eventSignature)
    : false;

  if (!validSig) {
    const errorMessage = `Webhook Error: invalid or missing event signature for event-id ${discourseHeaders["X-Discourse-Event-Id"]} `;
    throw new WebHookError(errorMessage, 403);
  }

  return postWebHookJson;
}
