import { Worker, Job } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection, getRedisClient } from "~/services/redisClient.server";

type TopicCommentsQueueArgs = {
  endpoint: string;
  headers: Headers;
  cachKey: string;
};

export const topicCommentsWorker = new Worker(
  "cacheTopicComments",
  async (job: Job) => {
    const { endpoint, headers, cacheKey } = job.data;

    try {
      const response = await fetch(endpoint, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const json = await response.json();
    } catch (error) {
      console.error(`Failed to process topicComments job: ${error}`);
      throw new Error("Failed to process job");
    }
  },
  { connection, limiter: { max: 1, duration: 1000 } }
);

export async function addRequestToQueue({
  endpoint,
  headers,
  cachKey,
}: TopicCommentsQueueArgs) {
  await apiRequestQueue.add("cacheTopicComments", {
    endpoint,
    headers,
    cachKey,
  });
}
