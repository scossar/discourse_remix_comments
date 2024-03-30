import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { discourseSessionStorage } from "~/services/session.server";

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
    { title: "Discourse Comments" },
    { name: "description", content: "Discourse Comments" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!process.env.DISCOURSE_BASE_URL) {
    return json({});
  }
  const discourseBaseUrl = process.env.DISCOURSE_BASE_URL;

  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const externalId = userSession.get("external_id");
  const admin: boolean = userSession.get("admin");

  const apiKey = process.env.DISCOURSE_API_KEY;
  const headers = new Headers();
  if (apiKey) {
    headers.append("Api-Key", apiKey);
    headers.append("Api-Username", "system");
  }

  const response = await fetch(`${discourseBaseUrl}/latest.json`, {
    headers: headers,
  });
  const latestTopics = await response.json();

  return json(
    {
      user: { externalId: externalId, admin: admin },
      latestTopics: latestTopics,
    },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    }
  );
};

export default function Index() {
  const { user, latestTopics }: any = useLoaderData<typeof loader>();
  const isAdmin = Boolean(user?.admin);

  return (
    <div className="max-w-screen-md mx-auto">
      <h1 className="text-3xl">Latest Topics</h1>
      <ul>
        {latestTopics?.topic_list?.topics?.map((topic: any) => (
          <li key={topic.id}>
            <Link
              className="hover:text-slate-400"
              to={`/t/${topic.slug}/${topic.id}`}
            >
              {topic?.unicode_title ? topic.unicode_title : topic.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
