import { addRequestToQueue } from "~/services/jobs/worker.server";

import { parseAndCacheTopicComments } from "~/services/parseAndCacheTopicComments.server";

import { discourseEnv } from "~/services/config.server";

export async function loader() {
  const { apiKey, baseUrl } = discourseEnv();

  const latestUrl = `${baseUrl}/t/-/454.json`;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");

  await parseAndCacheTopicComments(454);

  /*  const response = await addRequestToQueue({
    cacheKey: "topic:454",
    endpoint: latestUrl,
    method: "GET",
    headers: headers,
  }); */

  return null;
}

export default function HelloBull() {
  return (
    <div>
      <h1>Hello bull</h1>
      <p>This is a test, this is only a test...</p>
    </div>
  );
}
