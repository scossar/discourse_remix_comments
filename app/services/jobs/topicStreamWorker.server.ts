import { Job, Worker } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection, getRedisClient } from "~/services/redisClient.server";
import { discourseEnv } from "~/services/config.server";

type TopicStreamQueueArgs = {
  topicId: number;
};

export const topicStreamWorker = new Worker(
  apiRequestQueue.name,
  async (job: Job) => {
    if (job.name === "cacheTopicStream") {
      const { topicId } = job.data;
      const { apiKey, baseUrl } = discourseEnv();
      const endpoint = `${baseUrl}/t/-/${topicId}.json`;
      const headers = new Headers();
      headers.append("Content-Type", "application/json");
      headers.append("Api-Key", apiKey);
      headers.append("Api-Username", "system");
      try {
        const response = await fetch(endpoint, { headers });
        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const json = await response.json();
        const client = await getRedisClient();
        await client.set("streamFooBar", JSON.stringify(json));

        console.log(
          `response from topicStreamWorker: ${JSON.stringify(json, null, 2)}`
        );
      } catch (error) {
        console.error(`Failed to process topicStream job: ${error}`);
        await job.remove();
        throw new Error("Failed to process job");
      }
    }
  },
  { connection, limiter: { max: 1, duration: 1000 } }
);

export async function addTopicStreamRequest({ topicId }: TopicStreamQueueArgs) {
  await apiRequestQueue.add("cacheTopicStream", { topicId });
}
