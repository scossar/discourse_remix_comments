import { type DiscourseRawEnv, discourseEnv } from "~/services/config.server";
import { getRedisClient } from "~/services/redisClient.server";

export async function topicActionsForUserProcessor(
  topicId: number,
  username: string
) {
  console.log(`topicid: ${topicId}, username: ${username}`);
  fetchTopic(topicId, username, discourseEnv());
}

export async function fetchTopic(
  topicId: number,
  username: string,
  config: DiscourseRawEnv
) {
  const { apiKey, baseUrl } = config;
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username);
  const url = `${baseUrl}/t/-/${topicId}.json`
  fetch(url, { headers })


}
