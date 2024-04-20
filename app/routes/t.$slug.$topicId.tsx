import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  isRouteErrorResponse,
  Outlet,
  useLoaderData,
  useMatches,
  useOutletContext,
  useRouteError,
} from "@remix-run/react";

import { db } from "~/services/db.server";
import { discourseSessionStorage } from "~/services/session.server";
import type { ApiDiscourseConnectUser } from "~/types/apiDiscourse";
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
  const user: ApiDiscourseConnectUser = {
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

  return json(
    {
      topic,
      user,
    },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    }
  );
}

interface DiscourseData {
  baseUrl: string;
}

export default function TopicForSlugAndId() {
  const { topic } = useLoaderData<typeof loader>();
  const matches = useMatches();
  const pathEnd: string =
    matches.slice(-1)?.[0].pathname.split("/").slice(-1).toString() || "";
  const onCommentRoot = pathEnd === "comments";
  const discourseData: DiscourseData = useOutletContext();

  const categoryColor = topic?.category?.color
    ? `#${topic.category.color}`
    : "#ffffff";

  return (
    <div className="max-w-screen-md mx-auto pt-6 pb-12 relative">
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

      <Link className={`${onCommentRoot ? "hidden" : "block"}`} to={`comments`}>
        Comments
      </Link>

      <Outlet context={discourseData} />
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
