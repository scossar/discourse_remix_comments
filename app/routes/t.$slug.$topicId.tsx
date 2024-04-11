import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import { db } from "~/services/db.server";
import { discourseSessionStorage } from "~/services/session.server";
import type { SiteUser } from "~/types/discourse";
import { fetchCommentsForUser } from "~/services/fetchCommentsForUser";
import type { PostStreamForTopic } from "~/services/fetchCommentsForUser";
import Avatar from "~/components/Avatar";

export const meta: MetaFunction = () => {
  return [
    { title: "Discourse Topic" },
    { name: "description", content: "Discourse Topic Route" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const user: SiteUser = {
    externalId: userSession.get("external_id"),
    avatarUrl: userSession.get("avatar_url"),
    admin: userSession.get("admin"),
    username: userSession.get("username"),
  };

  const slug = params?.slug;
  const topicId = Number(params?.topicId);

  if (!slug || !topicId) {
    throw new Response("The route's required params were not set", {
      status: 500,
    });
  }

  const topic = await db.discourseTopic.findUnique({
    where: { externalId: topicId },
    include: {
      user: true,
      category: true,
      post: {
        where: {
          postNumber: 1,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  // todo: improve the error boundary
  if (!topic) {
    throw new Response(null, {
      status: 404,
      statusText: "Not Found",
    });
  }

  let comments;
  let errorMessage = null;
  const { searchParams } = new URL(request.url);
  const showComments = searchParams.get("showComments");

  if (showComments) {
    const lastPostId = Number(searchParams?.get("lastPostId")) ?? null;
    const page = Number(searchParams?.get("page")) ?? 0;
    const currentUsername = user?.["username"] ?? null;
    try {
      comments = await fetchCommentsForUser(
        topic.externalId,
        topic.slug,
        currentUsername,
        page,
        lastPostId
      );
    } catch {
      errorMessage = "Comments could not be loaded";
    }
  }

  return json(
    {
      topic,
      user,
      comments,
      errorMessage,
    },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    }
  );
}
interface CommentFetcher {
  data: {
    comments?: PostStreamForTopic | undefined;
  };
  comments?: PostStreamForTopic | undefined;
}

export default function TopicForSlugAndId() {
  const { topic } = useLoaderData<typeof loader>();
  const categoryColor = topic?.category?.color
    ? `#${topic.category.color}`
    : "#ffffff";

  const commentFetcher = useFetcher({
    key: "comment-fetcher",
  });
  const commentFetcherData = commentFetcher.data as CommentFetcher;

  let comments;
  if (commentFetcherData && commentFetcherData?.comments) {
    comments = commentFetcherData?.comments;
  }

  return (
    <div className="max-w-screen-md mx-auto pt-6 pb-12">
      <header className="pb-3 border-b-cyan-800 border-b">
        <h1 className="text-3xl">{topic.title}</h1>
        <div className="flex items-center text-sm">
          <div
            style={{ backgroundColor: `${categoryColor}` }}
            className={`inline-block p-2 mr-1`}
          ></div>
          <span className="pr-1">{topic.category?.name}</span>
          <span>
            {topic?.tags.map((topicTag) => (
              <span key={topicTag.tagId} className="px-1">
                {topicTag.tag.text}
              </span>
            ))}
          </span>
        </div>
      </header>
      <div className="discourse-op flex py-3 border-b border-cyan-800">
        <Avatar
          user={topic.user}
          size="48"
          className="rounded-full object-contain w-10 h-10 mt-3"
        />
        <div className="ml-2">
          {topic?.post?.cooked && (
            <div dangerouslySetInnerHTML={{ __html: topic.post.cooked }} />
          )}
        </div>
      </div>
      <div className="pt-3">
        <commentFetcher.Form action="?">
          <input type="hidden" name="showComments" value="true" />
          <button type="submit">Comments:</button>
        </commentFetcher.Form>
      </div>
      <div className="divide-y divide-cyan-800">
        {comments?.postStream?.posts?.map((post) => (
          <div key={post.id} className="my-6 discourse-comment flex">
            <Avatar
              user={{
                username: post.username,
                avatarTemplate: post.avatarUrl,
              }}
              absoluteUrl={true}
              className="rounded-full w-8 h-8 object-contain mt-2"
            />
            <div className="ml-2 w-full">
              <div className="w-full my-3">
                <span className="bg-slate-50 text-slate-900 inline-block p-4">
                  {post.postNumber}
                </span>
                <div dangerouslySetInnerHTML={{ __html: post.cooked }} />
              </div>
              <div className="flex justify-end w-full items-center">
                <button className="mr-2 px-2 py-1 bg-slate-50 hover:bg-slate-200 text-cyan-950 rounded-sm">
                  Reply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {comments && comments?.lastPostId && (
        <commentFetcher.Form action="?">
          <input type="hidden" name="showComments" value="true" />
          <input type="hidden" name="lastPostId" value={comments?.lastPostId} />
          <input type="hidden" name="page" value={comments.page} />
          <button type="submit">Load more comments</button>
        </commentFetcher.Form>
      )}
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
