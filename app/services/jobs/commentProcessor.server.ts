/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: re-enable no-unused-vars

import { type DiscourseApiWebHookPost } from "~/schemas/discourseApiResponse.server";
import { transformPost } from "~/services/transformDiscourseDataZod.server";
import { type DiscourseRawEnv, discourseEnv } from "~/services/config.server";

type CommentProcessorArgs = {
  topicId: number;
  postId: number;
  webHookJson: DiscourseApiWebHookPost;
};

export async function commentProcessor(args: CommentProcessorArgs) {
  const { baseUrl } = discourseEnv();
  const { topicId, postId, webHookJson } = args;
  const tranformedPost = transformPost(webHookJson.post, baseUrl);
  console.log(`transformedPost, ${JSON.stringify(transformPost, null, 2)}`);
}
