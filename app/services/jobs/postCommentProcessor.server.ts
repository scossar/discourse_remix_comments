/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PostCommentQueueArgs } from "~/services/jobs/rateLimitedApiWorker.server";
import { discourseEnv } from "~/services/config.server";
import { ApiError } from "~/services/errors/appErrors.server";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

export async function postCommentProcessor({
  topicId,
  replyToPostNumber,
  unsanitizedRaw,
  username,
}: PostCommentQueueArgs) {
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers({
    "Content-Type": "application/json",
    "Api-Key": apiKey,
    "Api-Username": username,
  });
  const url = `${baseUrl}/posts.json`;

  try {
    const window = new JSDOM("").window;
    const purify = DOMPurify(window);
    const raw = purify.sanitize(unsanitizedRaw, { ALLOWED_TAGS: [] });

    const data = {
      raw,
      topic_id: topicId,
      reply_to_post_number: replyToPostNumber,
    };

    const response = await fetch(url, {
      method: "Post",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      console.log(
        `handling error in postCommentProcessor: ${JSON.stringify(
          errorResponse,
          null,
          2
        )}`
      );
      throw new ApiError("Error posting comment to Discourse", response.status);
    }

    const json = await response.json();

    return json;
  } catch (error) {
    // TODO: improve this
    throw new ApiError("Unknown error");
  }
}