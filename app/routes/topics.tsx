import { json, redirect } from "@remix-run/node";
import {
  isRouteErrorResponse,
  useRouteError,
  useLoaderData,
} from "@remix-run/react";

interface User {
  id: number;
  username: string;
  avatar_template: string;
}

interface Poster {
  description: string;
  user_id: number;
}

interface Topic {
  id: number;
  title: string;
  unicode_title?: string;
  slug: string;
  posts_count: number;
  created_at: string;
  last_posted_at: string;
  archetype: "regular" | "private_message"; // a union type (archetype can be either "regular" or "private_message")
  views: number;
  like_count: number;
  last_poster_username: string;
  category_id: number;
  posters: Poster[]; // an array of Poster types
}

interface TopicList {
  users: User[]; // an array of User types
  topic_list: {
    more_topics_url?: string; // only set if there's another page of topics
    topics: Topic[]; // an array of Topic types
  };
}

function isValidTopicList(data: any): data is TopicList {
  return (
    "users" in data &&
    Array.isArray(data.users) &&
    "topic_list" in data &&
    data.topic_list?.topics &&
    Array.isArray(data.topic_list.topics)
  );
}

function meetsTopicLikeCountThreshold(minLikeCount = 2) {
  return (topic: Topic): boolean => {
    return topic.like_count >= minLikeCount;
  };
}

function isValidTopic(topic: any): topic is Topic {
  return (
    "id" in topic &&
    typeof topic.id === "number" &&
    "title" in topic &&
    typeof topic.title === "string" &&
    "slug" in topic &&
    typeof topic.slug === "string"
  );
}

export const loader = async () => {
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    return redirect("/");
  }
  const discourseBaseUrl = process.env.DISCOURSE_BASE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  if (!discourseBaseUrl || !apiKey) {
    return redirect("/");
  }

  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");

  const response = await fetch(`${discourseBaseUrl}/latest.json`, {
    headers: headers,
  });
  if (!response.ok) {
    throw new Response("Failed to fetch topics", {
      status: response.status,
      statusText: response.statusText,
    });
  }

  const data = await response.json();

  if (!isValidTopicList(data)) {
    throw new Response("invalid data returned", { status: 400 });
  }

  const latestTopics: TopicList = {
    users: data.users.map(({ id, username, avatar_template }: User) => ({
      id,
      username,
      avatar_template,
    })),
    topic_list: {
      more_topics_url: data.topic_list.more_topics_url,
      topics: data.topic_list.topics
        .filter(isValidTopic)
        .filter(meetsTopicLikeCountThreshold(1))
        .map((topic: Topic) => ({
          id: topic.id,
          title: topic.title,
          unicode_title: topic.unicode_title,
          slug: topic.slug,
          posts_count: topic.posts_count,
          created_at: topic.created_at,
          last_posted_at: topic.last_posted_at,
          archetype: topic.archetype,
          views: topic.views,
          like_count: topic.like_count,
          last_poster_username: topic.last_poster_username,
          category_id: topic.category_id,
          posters: topic.posters.map((poster: Poster) => ({
            description: poster.description,
            user_id: poster.user_id,
          })),
        })),
    },
  };

  return json({ latestTopics });
};

export default function Topics() {
  const { latestTopics } = useLoaderData<typeof loader>();
  const users = latestTopics.users;
  const topicList = latestTopics.topic_list;
  const topics = topicList.topics;
  console.log(`latestTopics: ${JSON.stringify(latestTopics, null, 2)}`);
  return (
    <div>
      <h1>Latest Topics</h1>
      <h2>Users</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.username}</li>
        ))}
      </ul>
      <h2>Topics</h2>
      <ul>
        {topics.map((topic) => (
          <li key={topic.id}>
            {topic?.unicode_title ? topic.unicode_title : topic.title}
            {topic.posters.map((poster) => poster.description)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.statusText) {
    return (
      <div>
        <h1>Topics are unable to be displayed at this time</h1>
        <p>Error: {error.statusText}</p>
      </div>
    );
  }
  return (
    <div>
      <h1>Topics are unabled to be displayed at this time</h1>
    </div>
  );
}
