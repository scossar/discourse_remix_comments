import { Worker, Job, QueueEvents } from "bullmq";
import { apiRequestQueue } from "../bullmq.server";

const connection = {
  db: 1,
};

type ApiRequestQueueArgs = {
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
      console.log(
        `response from worker: ${JSON.stringify(jsonResponse, null, 2)}`
      );
    } catch (error) {
      throw new Error("Failed to process job");
    }
  },
  { connection, limiter: { max: 1, duration: 1000 } }
);

export async function addRequestToQueue({
  endpoint,
  method,
  headers,
  body,
}: ApiRequestQueueArgs) {
  await apiRequestQueue.add("api-request", { endpoint, method, headers, body });
}

export const queueEvents = new QueueEvents("api-request");
