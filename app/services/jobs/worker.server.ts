import { Worker, Job } from "bullmq";
import { apiRequestQueue } from "~/services/bullmq.server";
import { getRedisClient } from "~/services/redisClient.server";
const connection = {
  db: 1,
};

type ApiRequestQueueArgs = {
  cacheKey: string;
  endpoint: string;
  method: "GET" | "PUT" | "POST" | "DELETE";
  headers: Headers;
  body?: string;
};

export const apiRequestWorker = new Worker(
  "api-request",
  async (job: Job) => {
    try {
      const response = await fetch(job.data.endpoint, {
        method: job.data.method,
        headers: job.data.headers,
        body: job.data?.body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const jsonResponse = await response.json();
      const client = await getRedisClient();
      await client.set(job.data.cacheKey, JSON.stringify(jsonResponse));
    } catch (error) {
      throw new Error("Failed to process job");
    }
  },
  { connection, limiter: { max: 1, duration: 1000 } }
);

export async function addRequestToQueue({
  cacheKey,
  endpoint,
  method,
  headers,
  body,
}: ApiRequestQueueArgs) {
  await apiRequestQueue.add("api-request", {
    cacheKey,
    endpoint,
    method,
    headers,
    body,
  });
}
