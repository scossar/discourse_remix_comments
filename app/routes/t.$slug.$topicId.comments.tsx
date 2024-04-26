import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useActionData,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

import { discourseSessionStorage } from "~/services/session.server";

import { transformPost } from "~/services/transformDiscourseData.server";

import { fetchCommentsForUser } from "~/services/fetchCommentsForUser.server";
import Comment from "~/components/Comment";
import CommentForm from "~/components/CommentForm";
import {
  ApiDiscourseConnectUser,
  ApiDiscoursePost,
} from "~/types/apiDiscourse";
import {
  ParsedDiscourseCommentReplies,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";

export const meta: MetaFunction = () => {
  return [
    { title: "Comments" },
    { name: "description", content: "comments for..." },
  ];
};

export async function action({ request, params }: ActionFunctionArgs) {
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    throw new Error("Env variables not configured");
  }

  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const user: ApiDiscourseConnectUser = {
    externalId: userSession.get("external_id"),
    avatarUrl: userSession.get("avatar_url"),
    admin: userSession.get("admin"),
    username: userSession.get("username"),
  };

  if (!user.externalId || !user.username) {
    throw new Error("User doesn't exist");
  }

  const topicId = Number(params?.topicId);
  if (!topicId) {
    throw new Error("Topic ID param is not set");
  }

  const formData = await request.formData();
  const raw = String(formData.get("raw"));
  if (!raw || raw.length < 2) {
    throw new Error(
      "This needs to be handled better. For example, return errors to the form"
    );
  }

  const replyToPostNumber = Number(formData.get("replyToPostNumber")) || null;

  let html;
  try {
    const window = new JSDOM("").window;
    const purify = DOMPurify(window);
    const cleaned = purify.sanitize(raw, { ALLOWED_TAGS: [] });
    html = await marked.parse(cleaned);
  } catch (error) {
    throw new Error("couldn't parse raw");
  }

  if (!html) {
    throw new Error("no html");
  }

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", process.env.DISCOURSE_API_KEY);
  headers.append("Api-Username", user.username);

  const postsUrl = `${process.env.DISCOURSE_BASE_URL}/posts.json`;
  const data = {
    raw: html,
    topic_id: topicId,
    reply_to_post_number: replyToPostNumber,
  };

  const response = await fetch(postsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Bad response returned from Discourse");
  }

  const apiDiscoursePost: ApiDiscoursePost = await response.json();

  const newComment = transformPost(
    apiDiscoursePost,
    process.env.DISCOURSE_BASE_URL
  );

  return json({ newComment });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const user: ApiDiscourseConnectUser = {
    externalId: userSession.get("external_id"),
    avatarUrl: userSession.get("avatar_url"),
    admin: userSession.get("admin"),
    username: userSession.get("username"),
  };

  const topicId = Number(params?.topicId);
  const slug = params?.slug;
  if (!slug || !topicId) {
    throw new Response("Required 'slug' and 'topicId' params not set", {
      status: 500,
    });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page")) || 0;
  const currentUsername = user?.username ?? null;

  let commentsForUser;
  let errorMessage;
  try {
    commentsForUser = await fetchCommentsForUser(
      topicId,
      currentUsername,
      page
    );
  } catch {
    errorMessage = "Comments could not be loaded";
    throw new Error("Something has gone wrong!");
  }

  return json(
    { commentsForUser, topicId, page, errorMessage, user },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    }
  );
}

type CommentFetcherData = {
  commentsForUser: ParsedDiscourseTopicComments;
};

export default function DiscourseComments() {
  const { commentsForUser, topicId } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const commentFetcher = useFetcher<CommentFetcherData>({ key: "comments" });
  const replyFetcher = useFetcher<ParsedDiscourseCommentReplies>({
    key: "replies",
  });
  const [posts, setPosts] = useState(commentsForUser.posts);
  const [nextPage, setNextPage] = useState(commentsForUser.nextPage);

  const [editorOpen, setEditorOpen] = useState(false);
  const [replyToPostNumber, setReplyToPostNumber] = useState("");

  function loadMoreComments() {
    if (commentFetcher.state === "idle" && nextPage) {
      commentFetcher.load(`/t/-/${topicId}/comments?page=${nextPage}`);
    }
  }

  if (replyFetcher.data?.posts) {
    console.log(
      `posts in the comment route: ${JSON.stringify(posts, null, 2)}`
    );
  }

  if (actionData && actionData.newComment) {
    console.log(
      `actionData postId: ${JSON.stringify(actionData.newComment.id, null, 2)}`
    );
  }

  useEffect(() => {
    if (
      commentFetcher.data?.commentsForUser.posts &&
      commentFetcher.data.commentsForUser.nextPage !== nextPage
    ) {
      const newPosts = commentFetcher.data.commentsForUser.posts;
      setNextPage(commentFetcher.data.commentsForUser.nextPage);
      setPosts((prevPosts) => [...prevPosts, ...newPosts]);
    }
  }, [commentFetcher.data, nextPage]);

  const handleReplyClick = (postNumber: string) => {
    console.log(`handleReplyClick: ${postNumber}`);
    setReplyToPostNumber(postNumber);
    setEditorOpen(true);
  };

  const handleCreatePostClick = () => {
    setEditorOpen(false);
  };

  const toggleEditorOpen = () => {
    setEditorOpen(!editorOpen);
  };

  const renderCommentsForUser = useMemo(() => {
    return (
      <div className="divide-y divide-cyan-800">
        {posts.map((post) => {
          return (
            <Comment
              key={post.id}
              post={post}
              handleReplyClick={handleReplyClick}
            />
          );
        })}
      </div>
    );
  }, [posts]);

  return (
    <div>
      <div className="">
        <div className="divide-y divide-cyan-800">{renderCommentsForUser}</div>
        {nextPage && (
          <div>
            <button
              className="px-2 py-1 text-blue-700 bg-white"
              onClick={loadMoreComments}
            >
              {commentFetcher.state === "idle" ? "Load more" : "Loading..."}
            </button>
          </div>
        )}
        <div
          className={`${
            editorOpen ? "min-h-52" : "h-8"
          } bg-red-200 fixed bottom-0 left-0 right-0 w-screen`}
        >
          <div
            className={`${
              editorOpen ? "min-h-52" : "h-8"
            } max-w-screen-md mx-auto bg-slate-50`}
          >
            {" "}
            <CommentForm
              replyToPostNumber={replyToPostNumber}
              handleCreatePostClick={handleCreatePostClick}
              toggleEditorOpen={toggleEditorOpen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface RouteError {
  status?: number;
  data?: string | null; // Adjust the type based on your actual data structure
}

export function ErrorBoundary() {
  const error = useRouteError() as unknown;
  const status = (error as RouteError).status;

  if (isRouteErrorResponse(error) && error?.data) {
    const errorMessage = error?.data;

    return (
      <div>
        <h1>Error Boundary Template</h1>
        <p>todo: be careful about what error messages get displayed:</p>
        <p>{errorMessage}</p>
      </div>
    );
  } else if (status && status === 404) {
    return <div>The page you were looking for could not be found</div>;
  } else {
    return (
      <div>
        <h1>Error Boundary Template</h1>
        <p>todo: this is just a template</p>
      </div>
    );
  }
}
