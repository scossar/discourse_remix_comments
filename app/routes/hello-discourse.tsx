import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";

import { discourseSessionStorage } from "~/services/session.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const formData = await request.formData();
  const currentUsername = formData.get("currentUsername");
  const topicId = Number(formData.get("topicId"));
  const rawComment = formData.get("rawComment");
  console.log(`rawComment: ${JSON.stringify(rawComment, null, 2)}`);
  console.log(typeof rawComment);
  console.log(typeof topicId);
  console.log(typeof currentUsername);
  if (
    !currentUsername ||
    typeof currentUsername !== "string" ||
    !topicId ||
    typeof topicId !== "number" ||
    !rawComment ||
    typeof rawComment !== "string"
  ) {
    return json({});
  }

  console.log("in the action!!!!!!!!!!!");

  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    return json({});
  }
  const discourseBaseUrl = process.env.DISCOURSE_BASE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;

  const data = {
    raw: rawComment,
    topic_id: topicId,
  };

  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", currentUsername);
  headers.append("Content-Type", "application/json");
  const postsUrl = `${process.env.DISCOURSE_BASE_URL}/posts.json`;
  const response = await fetch(postsUrl, {
    method: "Post",
    headers: headers,
    body: JSON.stringify(data),
  });

  const updatedTopic = await response.json();
  console.log(`Updated Topic: ${JSON.stringify(updatedTopic, null, 2)}`);

  return json({});
};

interface Post {
  id: number;
  username: string;
  avatar_template: string;
  created_at: string;
  cooked: string;
  post_number: number;
  post_type: 1 | 2 | 3 | 4; // :regular=>1, :moderator_action=>2, :small_action=>3, :whisper=>4
  updated_at: string;
  user_id: number;
}

interface Participant {
  id: number;
  username: string;
  post_count: number;
  avatar_template: string;
}

interface Details {
  can_create_post: boolean;
  participants: Participant[];
}

interface Topic {
  post_stream: {
    posts: Post[];
    stream: number[];
  };
  id: number;
  fancy_title: string;
  posts_count: number;
  like_count: number;
  archetype: "regular" | "personal_message";
  slug: string;
  category_id: number;
  user_id: number;
  details: Details;
}

interface User {
  externalId?: number;
  avatarUrl?: string;
  discourseAdmin?: boolean;
  username?: string;
}

function isRegularReplyPost(post: Post) {
  return post.post_type === 1 && post.post_number > 1;
}

function convertAvatarTemplate(
  avatarTemplate: string,
  discourseBaseUrl: string,
  size = "48"
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${discourseBaseUrl}${sized}`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const discourseUserSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const externalId = discourseUserSession.get("external_id");
  const avatarUrl = discourseUserSession.get("avatar_url");
  const discourseAdmin = discourseUserSession.get("admin");
  const username = discourseUserSession.get("username") ?? null;

  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    return redirect("/");
  }
  const discourseBaseUrl = process.env.DISCOURSE_BASE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!discourseBaseUrl || !apiKey) {
    return redirect("/");
  }

  const currentTopicId = 497;
  const currentTopicSlug = "hello-discourse";
  const topicUrl = `${discourseBaseUrl}/t/${currentTopicSlug}/${currentTopicId}.json`;

  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username ? username : "system");

  const response = await fetch(topicUrl, { headers: headers });

  if (!response.ok) {
    throw new Response("Failed to fetch topic", {
      status: response.status,
      statusText: response.statusText,
    });
  }
  const data: Topic = await response.json();

  const topic: Topic = {
    post_stream: {
      stream: data.post_stream.stream,
      posts: data.post_stream.posts
        .filter(isRegularReplyPost)
        .map((post: Post) => ({
          id: post.id,
          username: post.username,
          avatar_template: convertAvatarTemplate(
            post.avatar_template,
            discourseBaseUrl
          ), // maybe rename the avatar_template field?
          created_at: post.created_at,
          cooked: post.cooked,
          post_number: post.post_number,
          post_type: post.post_type,
          updated_at: post.updated_at,
          user_id: post.user_id,
        })),
    },
    id: data.id,
    fancy_title: data.fancy_title,
    posts_count: data.posts_count,
    like_count: data.like_count,
    archetype: data.archetype,
    slug: data.slug,
    category_id: data.category_id,
    user_id: data.user_id,
    details: {
      can_create_post: data.details.can_create_post,
      participants: data.details.participants.map(
        (participant: Participant) => ({
          id: participant.id,
          username: participant.username,
          post_count: participant.post_count,
          avatar_template: participant.avatar_template,
        })
      ),
    },
  };

  const user: User = {
    externalId: externalId,
    avatarUrl: avatarUrl,
    discourseAdmin: discourseAdmin,
    username: username,
  };

  return json(
    { topic, user },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(
          discourseUserSession
        ),
      },
    }
  );
};

export default function HelloDiscourse() {
  const { topic, user } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  return (
    <div className="pt-8">
      <div className="max-w-screen-lg mx-auto">
        <header>
          <h1 className="text-3xl">Hello Discourse</h1>
        </header>
        <article>
          <p className="my-4">
            This is an example post. It’s being used in the first step of
            developing a WP Recourse plugin (Headless WordPress {">"} Remix
            {">"} Discourse comments.)
          </p>
          <p className="my-4">
            The associated Discourse topic is at{" "}
            <Link
              className="text-cyan-200 hover:text-cyan-300"
              to="http://localhost:4200/t/hello-discourse/487"
            >
              http://localhost:4200/t/hello-discourse/497
            </Link>
            .
          </p>
        </article>
        <div>
          {topic.post_stream.posts.map((post) => (
            <div
              key={post.id}
              className="border-2 border-slate-100 px-2 py-3 my-3"
            >
              <div className="flex flex-row items-center">
                <img
                  className="rounded-full"
                  src={post.avatar_template}
                  alt={`avatar for ${post.username}`}
                />
                <span className="px-2">{post.username}</span>
              </div>
              <div className="mt-3">
                <div dangerouslySetInnerHTML={{ __html: post.cooked }} />
              </div>
            </div>
          ))}
        </div>
        <div>
          <fetcher.Form method="post" action="?" className="text-slate-900">
            <input
              type="hidden"
              name="currentUsername"
              value={user?.username}
            />
            <input type="hidden" name="topicId" value={topic.id} />
            <textarea
              name="rawComment"
              className="w-full h-28 p-2 my-4"
            ></textarea>
            <button className="bg-slate-50 px-3 py-2 rounded-sm" type="submit">
              Reply
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
