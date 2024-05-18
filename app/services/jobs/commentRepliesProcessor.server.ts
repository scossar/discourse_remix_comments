import { discourseEnv } from "~/services/config.server";

export async function commentRepliesProcessor(
  postId: number,
  username?: string
) {
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username ? username : "system");

  const url = `${baseUrl}/posts/${postId}/replies.json`;
}
