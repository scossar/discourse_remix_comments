import { Worker, Job } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection, getRedisClient } from "~/services/redisClient.server";

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
    const { cacheKey, endpoint, method, headers, body } = job.data;
    try {
      const response = await fetch(endpoint, { method, headers, body });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const jsonResponse = await response.json();
      const client = await getRedisClient();
      await client.set(
        cacheKey,
        JSON.stringify(jsonResponse),
        "EX",
        60 * 60 * 24
      );
    } catch (error) {
      console.error(`Failed to process job: ${error}`);
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
