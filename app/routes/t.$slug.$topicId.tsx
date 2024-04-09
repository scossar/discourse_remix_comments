import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useFetcher,
  useLoaderData,
  useRouteError,
  useSearchParams,
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

  // Probably the schema should be adjusted to change the DiscoursePost table to DiscourseOp. A
  // topic would then have 1 DiscourseOp. If comments need to be saved, they should be saved to a separate table.
  // that change would improve indexing.
  const topic = await db.discourseTopic.findUnique({
    where: { externalId: topicId },
    include: {
      user: true,
      category: true,
      posts: {
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
  console.log(JSON.stringify(topic, null, 2));

  let comments;
  let errorMessage = null;
  let { searchParams } = new URL(request.url);
  let showComments = searchParams.get("showComments");

  if (showComments) {
    // currentUsername is used in the request header so that the comments that are returned are specific to the user
    // if currentUsername is set to `null`, an unauthenticated request will be made for the comments
    // this limits users to viewing comments that they have permission to view on the site.
    const currentUsername = user?.["username"] ?? null;
    try {
      comments = await fetchCommentsForUser(
        topic.externalId,
        topic.slug,
        currentUsername
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
    ? `bg-[#${topic.category.color}]`
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
    <div className="max-w-screen-md mx-auto pt-6 divide-y divide-red-700">
      <header className="pb-3">
        <h1 className="text-3xl">{topic.title}</h1>
        <div>
          <div className={`inline-block ${categoryColor} p-2 mr-1`}></div>
          {topic.category?.name}
          {topic?.tags.map((topicTag) => topicTag.tag.text)}
        </div>
      </header>
      <div className="discourse-op flex pt-2">
        <Avatar
          user={topic.user}
          size="48"
          className="rounded-full object-contain w-12 h-12 mt-3"
        />
        <div className="ml-1">
          <div dangerouslySetInnerHTML={{ __html: topic.posts[0].cooked }} />
        </div>
      </div>
      <div>
        <commentFetcher.Form action="?">
          <input type="hidden" name="showComments" value="true" />
          <button type="submit">Comments</button>
        </commentFetcher.Form>
      </div>
      <div>
        {comments?.postStream?.posts?.map((post) => (
          <div key={post.id}>
            <div dangerouslySetInnerHTML={{ __html: post.cooked }} />
          </div>
        ))}
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
