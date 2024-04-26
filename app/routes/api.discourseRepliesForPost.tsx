import type { LoaderFunctionArgs } from "@remix-run/node";
import type { ApiDiscourseReplyPost } from "~/types/apiDiscourse";
import type { ParsedDiscourseCommentReplies } from "~/types/parsedDiscourse";
import { transformReplyPost } from "~/services/transformDiscourseData.server";

function isRegularPost(post: ApiDiscourseReplyPost) {
  return post.post_type === 1 && post.post_number > 1;
}

export async function loader({
  request,
}: LoaderFunctionArgs): Promise<ParsedDiscourseCommentReplies> {
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    throw new Error("Environment variables are not configured");
  }
  const baseUrl = process.env.DISCOURSE_BASE_URL;

  const { searchParams } = new URL(request.url);
  const postId = Number(searchParams.get("postId")) || null;

  console.log(`replies have been requested for postId: ${postId}`);

  if (!postId) {
    throw new Error("Request for comments without required postId");
  }

  const headers = new Headers();
  // for now
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", process.env.DISCOURSE_API_KEY);
  headers.append("Api-Username", "system");

  const response = await fetch(`${baseUrl}/posts/${postId}/replies.json`);

  if (!response.ok) {
    throw new Error("An error was returned fetching the replies");
  }

  const postsData: ApiDiscourseReplyPost[] = await response.json();

  return {
    posts: postsData
      .filter(isRegularPost)
      .map((post) => transformReplyPost(post, baseUrl)),
  };
}
