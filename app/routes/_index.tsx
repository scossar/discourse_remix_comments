import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { discourseSessionStorage } from "~/services/session.server";
import type { SiteUser } from "~/types/discourse";
import { db } from "~/services/db.server";
import type { DiscourseTopic } from "@prisma/client";

export interface TopicListTopic {
  id: number;
  title: string;
  fancy_title: string;
  unicode_title?: string;
  slug: string;
  posts_count: number;
  created_at: Date;
  excerpt?: string;
}

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

  const user: SiteUser = {
    externalId: externalId,
    avatarUrl: avatarUrl,
    admin: admin,
    username: username,
  };

  const topics: DiscourseTopic[] = await db.discourseTopic.findMany({
    include: {
      tags: true,
      user: true,
      category: true,
    },
  });
  console.log(JSON.stringify(topics, null, 2));

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
  const { user, topics } = useLoaderData<typeof loader>();
  const isAdmin = Boolean(user?.admin);

  return (
    <div className="max-w-screen-md mx-auto">
      <h1 className="text-3xl">Latest Topics</h1>
      <ul className="list-none">
        {topics?.map((topic) => (
          <li key={topic.id}>{topic.fancyTitle}</li>
        ))}
      </ul>
    </div>
  );
}
