import type {
  ApiDiscourseParticipant,
  ApiDiscoursePost,
} from "~/types/apiDiscourse";
import type {
  ParsedDiscourseParticipant,
  ParsedDiscoursePost,
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
