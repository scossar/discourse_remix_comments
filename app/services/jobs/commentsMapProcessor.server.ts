import QueueError from "~/services/errors/queueError.server";
//import type { ParsedDiscourseCommentsMap } from "~/types/parsedDiscourse";

import { discourseEnv } from "~/services/config.server";
export async function commentsMapProcessor(topicId: number, username?: string) {
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username ?? "system");
  const url = `${baseUrl}/t/-/${topicId}.json`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new QueueError(
      `Failed to fetch commentsMap data for topicID: ${topicId}`,
      response.status
    );
  }
}
