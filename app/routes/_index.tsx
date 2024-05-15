import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { discourseSessionStorage } from "~/services/session.server";
import { getSessionData, validateSession } from "~/schemas/currentUser.server";
import { db } from "~/services/db.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Discourse Topics" },
    { name: "description", content: "Discourse Topics" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const sessionData = getSessionData(session);
  const currentUser = validateSession(sessionData);
  const topics = await db.discourseTopic.findMany({
    include: {
      tags: true,
      user: true,
      category: true,
    },
  });

  return json(
    {
      currentUser,
      topics,
    },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(session),
      },
    }
  );
};

export default function Index() {
  const { topics } = useLoaderData<typeof loader>();

  return (
    <div className="pt-6 mx-auto max-w-screen-md">
      <h1 className="text-3xl">Latest Topics</h1>
      <ul className="list-none divide-y divide-cyan-600">
        {topics?.map((topic) => (
          <li key={topic.id} className="flex items-center py-2 my-2">
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
