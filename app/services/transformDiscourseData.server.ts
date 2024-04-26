import type {
  ApiDiscourseBasicUser,
  ApiDiscourseParticipant,
  ApiDiscoursePost,
  ApiDiscourseReplyPost,
} from "~/types/apiDiscourse";
import type {
  ParsedDiscourseBasicUser,
  ParsedDiscourseParticipant,
  ParsedDiscoursePost,
  ParsedDiscourseReplyPost,
} from "~/types/parsedDiscourse";

export function generateAvatarUrl(
  avatarTemplate: string,
  discourseBaseUrl: string,
  size = "48"
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${discourseBaseUrl}${sized}`;
}

export function transformPost(
  apiPost: ApiDiscoursePost,
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
    updatedAt: apiPost.updated_at,
    userId: apiPost.user_id,
  };
}

export function transformReplyPost(
  apiReplyPost: ApiDiscourseReplyPost,
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
    updatedAt: apiReplyPost.updated_at,
    userId: apiReplyPost.user_id,
    replyToUser: transformUser(apiReplyPost.reply_to_user, baseUrl),
  };
}

export function transformUser(
  apiUser: ApiDiscourseBasicUser,
  baseUrl: string
): ParsedDiscourseBasicUser {
  return {
    id: apiUser.id,
    username: apiUser.username,
    avatarUrl: generateAvatarUrl(apiUser.avatar_template, baseUrl),
  };
}

export function transformParticipant(
  apiParticipant: ApiDiscourseParticipant,
  baseUrl: string
): ParsedDiscourseParticipant {
  return {
    id: apiParticipant.id,
    username: apiParticipant.username,
    postCount: apiParticipant.post_count,
    avatarUrl: generateAvatarUrl(apiParticipant.avatar_template, baseUrl),
  };
}
