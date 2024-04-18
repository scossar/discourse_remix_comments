import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { discourseSessionStorage } from "~/services/session.server";
import type { ApiDiscourseConnectUser } from "~/types/apiDiscourse";
import { db } from "~/services/db.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Discourse Topics" },
    { name: "description", content: "Discourse Topics" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const externalId = userSession.get("external_id");
  const avatarUrl = userSession.get("avatar_url");
  const admin: boolean = userSession.get("admin");
  const username = userSession.get("username");

  const user: ApiDiscourseConnectUser = {
    externalId: externalId,
    avatarUrl: avatarUrl,
    admin: admin,
    username: username,
  };

  const topics = await db.discourseTopic.findMany({
    include: {
      tags: true,
      user: true,
      category: true,
    },
  });

  return json(
    {
      user,
      topics,
    },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    }
  );
};

export default function Index() {
  const { topics } = useLoaderData<typeof loader>();

  return (
    <div className="max-w-screen-md mx-auto pt-6">
      <h1 className="text-3xl">Latest Topics</h1>
      <ul className="list-none divide-y divide-cyan-600">
        {topics?.map((topic) => (
          <li key={topic.id} className="flex items-center my-2 py-2">
            <Link
              className="hover:underline"
              to={`/t/${topic.slug}/${topic.externalId}`}
            >
              {topic.fancyTitle}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
