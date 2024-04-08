import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";

import { db } from "~/services/db.server";
import { discourseSessionStorage } from "~/services/session.server";
import type { SiteUser } from "~/types/discourse";
import Avatar from "~/components/Avatar";

export const meta: MetaFunction = () => {
  return [
    { title: "Discourse Topic" },
    { name: "description", content: "Discourse Topic Route" },
  ];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  const slug = params?.slug;
  const topicId = Number(params?.topicId);

  console.log(`slug: ${slug}, topicId: ${topicId}`);

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

  console.log(`topic: ${JSON.stringify(topic, null, 2)}`);

  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const user: SiteUser = {
    externalId: userSession.get("external_id"),
    avatarUrl: userSession.get("avatar_url"),
    admin: userSession.get("admin"),
    username: userSession.get("username"),
  };
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
  const categoryColor = topic?.category?.color
    ? `#${topic.category.color}`
    : "#ffffff";

  return (
    <div className="max-w-screen-md mx-auto pt-6 divide-y divide-red-700">
      <header className="pb-3">
        <h1 className="text-3xl">{topic.fancyTitle}</h1>
        <div>
          <div className={`inline-block bg-[${categoryColor}] p-2 mr-1`}></div>
          {topic.category?.name}
          {topic?.tags.map((tag) => tag.tagId)}
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
