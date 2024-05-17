import { Job, Worker } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection, getRedisClient } from "~/services/redisClient.server";
import { postStreamProcessor } from "~/services/jobs/postStreamProcessor.server";
import { topicCommentsProcessor } from "~/services/jobs/topicCommentsProcessor.server";
import QueueError from "~/services/errors/queueError.server";
import { getPostStreamKey } from "~/services/redisKeys.server";

export type TopicStreamQueueArgs = {
  topicId: number;
};

export type TopicCommentsQueueArgs = {
  topicId: number;
  page: number;
  username?: string;
};

export const rateLimitedApiWorker = new Worker(
  apiRequestQueue.name,
  async (job: Job) => {
    if (job.name === "cacheTopicPostStream") {
      const { topicId } = job.data;
      try {
        await postStreamProcessor(topicId);

        return topicId;
      } catch (error) {
        console.error(`Failed to process topicStream job: ${error}`);
        await job.remove();
        throw new QueueError("Failed to process cacheTopicPostStream job");
      }
    }

    if (job.name === "cacheTopicComments") {
      const { topicId, page, username } = job.data;
      try {
        await topicCommentsProcessor(topicId, page, username);
      } catch (error) {
        console.error(`Failed to process cacheTopicComments job: ${error}`);
        await job.remove();
        throw new QueueError("Failed to process cacheTopicComments job");
      }
    }
  },
  { connection, limiter: { max: 1, duration: 1000 } }
);

export async function addTopicStreamRequest({ topicId }: TopicStreamQueueArgs) {
  await apiRequestQueue.add("cacheTopicPostStream", { topicId });
}

export async function addTopicCommentsRequest({
  topicId,
  page,
  username,
}: TopicCommentsQueueArgs) {
  await apiRequestQueue.add("cacheTopicComments", {
    topicId,
    page,
    username,
  });
}

rateLimitedApiWorker.on("completed", async (job: Job) => {
  const topicId = job.returnvalue;
  try {
    const client = await getRedisClient();
    const streamLength = await client.llen(getPostStreamKey(topicId));
    console.log(`topicId: ${topicId}, streamLength: ${streamLength}`);
    // TODO: validate before proceeding
    if (topicId && streamLength) {
      const totalPages = Math.ceil(streamLength / 20);
      for (let page = 0; page < totalPages; page++) {
        await addTopicCommentsRequest({ topicId: topicId, page: page });
      }
    }
  } catch (error) {
    throw new QueueError("Error initializing Redis client");
  }
});
