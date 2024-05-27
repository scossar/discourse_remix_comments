import { addCommentRepliesRequest } from "./jobs/rateLimitedApiWorker.server";
import type {
  DiscourseApiBasicUser,
  DiscourseApiParticipant,
  DiscourseApiReplyToUser,
  DiscourseApiBasicPost,
  DiscourseApiReplyPost,
  DiscourseApiReaction,
} from "~/schemas/discourseApiResponse.server";

import type {
  ParsedDiscourseBasicUser,
  ParsedDiscourseParticipant,
  ParsedDiscoursePost,
  ParsedDiscourseReplyPost,
  ParsedDiscourseReplyToUser,
  ParsedDiscourseBasicReaction,
} from "~/types/parsedDiscourse";

export function generateAvatarUrl(
  avatarTemplate: string,
  discourseBaseUrl: string,
  size = "48"
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${discourseBaseUrl}${sized}`;
}

export function transformReaction(
  reaction: DiscourseApiReaction
): ParsedDiscourseBasicReaction {
  return {
    id: reaction.id,
    type: reaction.type,
    count: reaction.count,
  };
}

export function transformPost(
  apiPost: DiscourseApiBasicPost,
  baseUrl: string
): ParsedDiscoursePost {
  return {
    id: apiPost.id,
    username: apiPost.username,
    avatarUrl: generateAvatarUrl(apiPost.avatar_template, baseUrl),
    createdAt: apiPost.created_at,
    cooked: apiPost.cooked,
    postNumber: apiPost.post_number,
    replyCount: apiPost.reply_count,
    replyToPostNumber: apiPost.reply_to_post_number,
    topicId: apiPost.topic_id,
    updatedAt: apiPost.updated_at,
    userId: apiPost.user_id,
    reactions: apiPost.reactions.map((reaction) => transformReaction(reaction)),
  };
}

export async function transformPostAndQueueReplies(
  apiPost: DiscourseApiBasicPost,
  baseUrl: string
): Promise<ParsedDiscoursePost> {
  if (apiPost.reply_count > 0) {
    const postId = apiPost.id;
    try {
      await addCommentRepliesRequest({ postId });
    } catch (error) {
      // TODO: handle this better
      throw new Error("don't use this function");
    }
  }
  return {
    id: apiPost.id,
    username: apiPost.username,
    avatarUrl: generateAvatarUrl(apiPost.avatar_template, baseUrl),
    createdAt: apiPost.created_at,
    cooked: apiPost.cooked,
    postNumber: apiPost.post_number,
    replyCount: apiPost.reply_count,
    replyToPostNumber: apiPost.reply_to_post_number,
    topicId: apiPost.topic_id,
    updatedAt: apiPost.updated_at,
    userId: apiPost.user_id,
    reactions: apiPost.reactions.map((reaction) => transformReaction(reaction)),
  };
}

export function transformReplyPost(
  apiReplyPost: DiscourseApiReplyPost,
  baseUrl: string
): ParsedDiscourseReplyPost {
  return {
    id: apiReplyPost.id,
    username: apiReplyPost.username,
    avatarUrl: generateAvatarUrl(apiReplyPost.avatar_template, baseUrl),
    createdAt: apiReplyPost.created_at,
    cooked: apiReplyPost.cooked,
    postNumber: apiReplyPost.post_number,
    replyCount: apiReplyPost.reply_count,
    replyToPostNumber: apiReplyPost.reply_to_post_number,
    topicId: apiReplyPost.topic_id,
    updatedAt: apiReplyPost.updated_at,
    userId: apiReplyPost.user_id,
    replyToUser: transformReplyToUser(apiReplyPost.reply_to_user, baseUrl),
    reactions: apiReplyPost.reactions.map((reaction) =>
      transformReaction(reaction)
    ),
  };
}

export function transformUser(
  apiUser: DiscourseApiBasicUser,
  baseUrl: string
): ParsedDiscourseBasicUser {
  return {
    id: apiUser.id,
    username: apiUser.username,
    avatarUrl: generateAvatarUrl(apiUser.avatar_template, baseUrl),
  };
}

export function transformParticipant(
  apiParticipant: DiscourseApiParticipant,
  baseUrl: string
): ParsedDiscourseParticipant {
  return {
    id: apiParticipant.id,
    username: apiParticipant.username,
    postCount: apiParticipant.post_count,
    avatarUrl: generateAvatarUrl(apiParticipant.avatar_template, baseUrl),
  };
}

export function transformReplyToUser(
  replyToUser: DiscourseApiReplyToUser,
  baseUrl: string
): ParsedDiscourseReplyToUser {
  return {
    username: replyToUser.username,
    avatarUrl: generateAvatarUrl(replyToUser.avatar_template, baseUrl),
  };
}
