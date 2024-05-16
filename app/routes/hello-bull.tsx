import {
  addTopicStreamRequest,
  addTopicCommentsRequest,
} from "~/services/jobs/postStreamWorker.server";

import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";

import { discourseEnv } from "~/services/config.server";
import { getRedisClient } from "~/services/redisClient.server";
import { getTopicCommentsKey } from "~/services/redisKeys.server";
import type { ParsedDiscourseTopicComments } from "~/types/parsedDiscourse";

export async function loader() {
  const { apiKey, baseUrl } = discourseEnv();

  const latestUrl = `${baseUrl}/t/-/454.json`;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");

  //await addTopicStreamRequest({ topicId: 454 });
  //await addTopicCommentsRequest({ topicId: 454, page: 0 });

  const client = await getRedisClient();
  let parsed: ParsedDiscourseTopicComments;
  const stringifiedJson = await client.get(getTopicCommentsKey(454, 0));
  if (stringifiedJson) {
    parsed = JSON.parse(stringifiedJson);
  } else {
    throw new Error("this is lazy");
  }
  return json({ comments: parsed });
}

export default function HelloBull() {
  const { comments } = useLoaderData<typeof loader>();
  const posts = comments.pagedPosts?.[comments.currentPage];
  console.log(JSON.stringify(posts, null, 2));
  return (
    <div className="mx-auto max-w-prose">
      <h1>JSON stringify and unstringify test</h1>
      <ul>
        <li>Topic ID: {comments.topicId}</li>
        <li>currentPage: {comments.currentPage}</li>
        <li>nextPage: {comments.nextPage}</li>
        <li>
          previousPage: {comments.previousPage ? comments.previousPage : "null"}
        </li>
      </ul>
      <div>
        {posts.map((post) => (
          <div key={post.id}>
            <div dangerouslySetInnerHTML={{ __html: post.cooked }} />
          </div>
        ))}
      </div>
    </div>
  );
}
