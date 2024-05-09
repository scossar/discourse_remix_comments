import type {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

import { db } from "~/services/db.server";
import { discourseEnv } from "~/services/config.server";
import { discourseSessionStorage } from "~/services/session.server";
import { getSessionData, validateSession } from "~/schemas/currentUser.server";
import { transformPost } from "~/services/transformDiscourseData.server";
import type { RouteError } from "~/types/errorTypes";
import type { ApiDiscoursePost } from "~/types/apiDiscourse";
import Topic from "~/components/Topic";
import Comments from "~/components/Comments";

export const meta: MetaFunction = () => {
  return [
    { title: "Discourse Topic" },
    { name: "description", content: "Discourse Topic Route" },
  ];
};

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const sessionData = getSessionData(session);
  const currentUser = validateSession(sessionData);

  if (currentUser.externalId === null || currentUser.username === null) {
    throw new Error("Comments can only be created by authenticated users");
  }

  const topicId = Number(params?.topicId);
  if (!topicId) {
    throw new Error("Required topicId param is not set");
  }

  const formData = await request.formData();
  /* const raw = String(formData.get("raw"));
  if (!raw || raw.length < 2) {
    throw new Error("Todo: all these errors need to be handled");
  }*/

  const unsanitizedMarkdown = String(formData.get("markdown")) || "";
  const replyToPostNumber = Number(formData.get("replyToPostNumber")) || null;

  let cleaned;
  try {
    const window = new JSDOM("").window;
    const purify = DOMPurify(window);
    cleaned = purify.sanitize(unsanitizedMarkdown, { ALLOWED_TAGS: [] });
    // html = await marked.parse(cleaned);
  } catch (error) {
    throw new Error("couldn't sanitize rawMarkdown");
  }

  if (!cleaned) {
    throw new Error(
      "Don't actually throw an error here, return an error message to the user"
    );
  }

  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", currentUser.username);

  const postsUrl = `${baseUrl}/posts.json`;
  const data = {
    raw: cleaned,
    topic_id: topicId,
    reply_to_post_number: replyToPostNumber,
  };

  const response = await fetch(postsUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Bad response returned from Discourse");
  }

  const apiDiscoursePost: ApiDiscoursePost = await response.json();

  const newComment = transformPost(apiDiscoursePost, baseUrl);

  return json({ newComment });
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const sessionData = getSessionData(session);
  const currentUser = validateSession(sessionData);

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
      currentUser,
    },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(session),
      },
    }
  );
}

export default function TopicForSlugAndId() {
  const { topic } = useLoaderData<typeof loader>();

  return (
    <div className="relative pt-6 pb-12 mx-auto max-w-screen-md">
      <Topic topic={topic} />
      <Comments topicId={topic.externalId} />
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
