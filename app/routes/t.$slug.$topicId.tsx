import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import { db } from "~/services/db.server";
import { discourseSessionStorage } from "~/services/session.server";
import type { ApiDiscourseConnectUser } from "~/types/apiDiscourse";
import type { RouteError } from "~/types/errorTypes";
import Topic from "~/components/Topic";
import Comments from "~/components/Comments";

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

export default function TopicForSlugAndId() {
  const { topic } = useLoaderData<typeof loader>();

  return (
    <div className="relative pt-6 pb-12 mx-auto max-w-screen-md">
      <Topic topic={topic} />
      <Comments topicId={topic.id} />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError() as RouteError;
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
