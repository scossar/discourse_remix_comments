/* eslint-disable @typescript-eslint/no-unused-vars */
// TODO: re-enable no-unused-vars

import { type DiscourseApiWebHookPost } from "~/schemas/discourseApiResponse.server";

type CommentProcessorArgs = {
  topicId: number;
  postId: number;
  postJson: DiscourseApiWebHookPost;
};

export async function commentProcessor(args: CommentProcessorArgs) {
  const { topicId, postId, postJson } = args;
}
