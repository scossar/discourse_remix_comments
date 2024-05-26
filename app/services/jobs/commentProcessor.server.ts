/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: re-enable no-unused-vars

import { type DiscourseApiWebHookPost } from "~/schemas/discourseApiResponse.server";
import { transformPost } from "~/services/transformDiscourseDataZod.server";
import { type DiscourseRawEnv, discourseEnv } from "~/services/config.server";
import { type CommentProcessorArgs } from "~/services/jobs/rateLimitedApiWorker.server";

export async function commentProcessor({
  postWebHookJson,
}: CommentProcessorArgs) {
  const { baseUrl } = discourseEnv();
  try {
    const tranformedPost = transformPost(postWebHookJson.post, baseUrl);
    console.log(`transformedPost, ${JSON.stringify(tranformedPost, null, 2)}`);
  } catch (error) {
    // TODO: handle error
    throw new Error();
  }
}
