import { Job, Worker } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection } from "~/services/redisClient.server";
import { postStreamProcessor } from "~/services/jobs/postStreamProcessor.server";

export type TopicStreamQueueArgs = {
  topicId: number;
};

export const topicStreamWorker = new Worker(
  apiRequestQueue.name,
  async (job: Job) => {
    if (job.name === "cacheTopicStream") {
      const { topicId } = job.data;
      try {
        await postStreamProcessor(topicId);
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
