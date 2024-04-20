import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";

import { discourseSessionStorage } from "~/services/session.server";

import { fetchCommentsForUser } from "~/services/fetchCommentsForUser.server";
import Comment from "~/components/Comment";
import CommentForm from "~/components/CommentForm";
import { ApiDiscourseConnectUser } from "~/types/apiDiscourse";
import {
  ParsedDiscourseTopic,
  ParsedPagedDiscourseTopic,
} from "~/types/parsedDiscourse";

export const meta: MetaFunction = () => {
  return [
    { title: "Comments" },
    { name: "description", content: "comments for..." },
  ];
};

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
  console.log("comment route loader function");

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

  let postStreamForUser;
  let errorMessage;
  try {
    postStreamForUser = await fetchCommentsForUser(
      topicId,
      currentUsername,
      page
    );
  } catch {
    errorMessage = "Comments could not be loaded";
    throw new Error("Something has gone wrong!");
  }

  return json(
    { postStreamForUser, topicId, errorMessage, user },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    }
  );
}
interface FetcherData {
  postStreamForUser: ParsedPagedDiscourseTopic;
}

export default function DiscourseComments() {
  const { postStreamForUser, topicId } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<FetcherData>();
  const pageRef = useRef(Number(Object.keys(postStreamForUser)[0]));
  const [pages, setPages] = useState(postStreamForUser);
  const { ref, inView } = useInView({ threshold: 0 });
  const [editorOpen, setEditorOpen] = useState(false);

  const handleReplyClick = (postId: number) => {
    setEditorOpen(true);
    // use postId
  };

  useEffect(() => {
    if (fetcher?.data && fetcher.data.postStreamForUser) {
      const allPages = { ...pages, ...fetcher.data.postStreamForUser };
      setPages(allPages);
    }
  }, [fetcher?.data?.postStreamForUser]);

  // there needs to be a way to track when you're on the last page!
  useEffect(() => {
    if (inView && fetcher.state === "idle") {
      pageRef.current += 1;
      fetcher.load(`/t/-/${topicId}/comments?page=${pageRef.current}`);
    }
  }, [inView]);

  const renderComments = useMemo(() => {
    return Object.entries(pages).map(([currentPage, topicData]) => (
      <div key={currentPage} className="divide-y divide-cyan-800">
        {topicData?.postStream?.posts.map((post, index) => {
          const isLastComment = index === topicData.postStream.posts.length - 1;
          return (
            <Comment
              key={post.id}
              post={post}
              handleReplyClick={handleReplyClick}
              ref={isLastComment ? ref : null}
            />
          );
        })}
      </div>
    ));
  }, [pages]);

  return (
    <div>
      <div className="">
        {Object.entries(pages).map(([currentPage, topicData]) => (
          <div key={currentPage} className="divide-y divide-cyan-800">
            {renderComments}
          </div>
        ))}
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
            <CommentForm />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error: any = useRouteError();
  const status = error?.status;

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
