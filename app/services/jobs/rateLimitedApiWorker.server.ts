import { Job, Worker } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection } from "~/services/redisClient.server";
import { postStreamProcessor } from "~/services/jobs/postStreamProcessor.server";
import { topicCommentsProcessor } from "~/services/jobs/topicCommentsProcessor.server";
import { commentsMapProcessor } from "~/services/jobs/commentsMapProcessor.server";
import { commentRepliesProcessor } from "~/services/jobs/commentRepliesProcessor.server";
import QueueError from "~/services/errors/queueError.server";

export type TopicStreamQueueArgs = {
  topicId: number;
};

export type TopicCommentsQueueArgs = {
  topicId: number;
  page: number;
  username?: string;
};

export type CommentsMapQueueArgs = {
  topicId: number;
  username?: string;
};

export const rateLimitedApiWorker = new Worker(
  apiRequestQueue.name,
  async (job: Job) => {
    if (job.name === "cacheTopicPostStream") {
      const { topicId } = job.data;
      try {
        const stream = await postStreamProcessor(topicId);

        return { topicId, stream };
      } catch (error) {
        console.error(`Failed to process topicStream job: ${error}`);
        throw new QueueError("Failed to process cacheTopicPostStream job");
      }
    }

    if (job.name === "cacheTopicComments") {
      const { topicId, page, username } = job.data;
      try {
        const stringifiedComments = await topicCommentsProcessor(
          topicId,
          page,
          username
        );

        return { topicId, page, stringifiedComments };
      } catch (error) {
        console.error(`Failed to process cacheTopicComments job: ${error}`);
        throw new QueueError("Failed to process cacheTopicComments job");
      }
    }

    if (job.name === "cacheCommentsMap") {
      const { topicId, username } = job.data;
      try {
        const stream = await commentsMapProcessor(topicId, username);

        return { topicId, stream };
      } catch (error) {
        console.error(`Failed to process cacheCommentsMap job: ${error}`);
        throw new QueueError("Failed to process cacheCommentsMap job");
      }
    }
  },
  { connection, limiter: { max: 1, duration: 1000 } }
);

export async function addTopicStreamRequest({ topicId }: TopicStreamQueueArgs) {
  const jobId = `stream-${topicId}`;
  await apiRequestQueue.add("cacheTopicPostStream", { topicId }, { jobId });
}

export async function addTopicCommentsRequest({
  topicId,
  page,
  username,
}: TopicCommentsQueueArgs) {
  const jobId = username
    ? `comments-${topicId}-${page}-${username}`
    : `comments-${topicId}-${page}`;
  await apiRequestQueue.add(
    "cacheTopicComments",
    {
      topicId,
      page,
      username,
    },
    { jobId }
  );
}

export async function addCommentsMapRequest({
  topicId,
  username,
}: CommentsMapQueueArgs) {
  const jobId = username ? `map-${topicId}-${username}` : `map-${topicId}`;
  await apiRequestQueue.add(
    "cacheCommentsMap",
    { topicId, username },
    { jobId }
  );
}

rateLimitedApiWorker.on("completed", async (job: Job) => {
  if (job.name === "cacheCommentsMap") {
    const { topicId, stream } = job.returnvalue;
    if (stream.length && Number(topicId)) {
      try {
        const streamLength = stream.length;
        const totalPages = Math.ceil(streamLength / 20);
        for (let page = 0; page < totalPages; page++) {
          console.log(
            `adding topicCommentRequest for topicId: ${topicId}, page: ${page}`
          );
          await addTopicCommentsRequest({ topicId: topicId, page: page });
        }
      } catch (error) {
        throw new QueueError(
          `Error handling "completed" event for topicId: ${topicId}`
        );
      }
    }
  }
});
