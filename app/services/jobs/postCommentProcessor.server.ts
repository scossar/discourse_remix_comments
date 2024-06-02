/* eslint-disable @typescript-eslint/no-unused-vars */
import type { PostCommentQueueArgs } from "~/services/jobs/rateLimitedApiWorker.server";
import { discourseEnv } from "~/services/config.server";
import { ApiError } from "~/services/errors/appErrors.server";

export async function postCommentProcessor({
  topicId,
  replyToPostNumber,
  raw,
  username,
}: PostCommentQueueArgs) {
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers({
    "Content-Type": "application/json",
    "Api-Key": apiKey,
    "Api-Username": username,
  });

  const url = `${baseUrl}/posts.json`;
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
    throw new ApiError("Error posting comment to Discourse", response.status);
  }

  const json = await response.json();

  return json;
}
