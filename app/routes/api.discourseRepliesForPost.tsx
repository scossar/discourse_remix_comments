import type { LoaderFunctionArgs } from "@remix-run/node";

import { discourseEnv } from "~/services/config.server";

import { validateDiscourseApiReplyPosts } from "~/schemas/discourseApiResponse.server";
import type { ParsedDiscourseCommentReplies } from "~/types/parsedDiscourse";
import { transformReplyPost } from "~/services/transformDiscourseDataZod.server";

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<ParsedDiscourseCommentReplies> {
  const { baseUrl, apiKey } = discourseEnv();
  const { searchParams } = new URL(request.url);
  const postId = Number(searchParams.get("postId")) || null;

  if (!postId) {
    throw new Error("Request for comments without required postId");
  }

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");

  const response = await fetch(`${baseUrl}/posts/${postId}/replies.json`);

  if (!response.ok) {
    throw new Error("An error was returned fetching the replies");
  }

  const postsData = await response.json();
  const validReplyPosts = validateDiscourseApiReplyPosts(postsData);

  return {
    repliesForPostId: postId,
    posts: validReplyPosts.map((post) => transformReplyPost(post, baseUrl)),
  };
}
