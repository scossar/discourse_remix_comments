import { Job, Worker } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection } from "~/services/redisClient.server";
import { postStreamProcessor } from "~/services/jobs/postStreamProcessor.server";
import { topicCommentsProcessor } from "~/services/jobs/topicCommentsProcessor.server";
import { commentsMapProcessor } from "~/services/jobs/commentsMapProcessor.server";
import { commentRepliesProcessor } from "~/services/jobs/commentRepliesProcessor.server";
import { webHookCategoryProcessor } from "~/services/jobs/webHookCategoryProcessor.server";
import { JobError } from "~/services/errors/appErrors.server";

type TopicStreamQueueArgs = {
  topicId: number;
};

type TopicCommentsQueueArgs = {
  topicId: number;
  page: number;
  username?: string;
};

type CommentsMapQueueArgs = {
  topicId: number;
  username?: string;
};

type commentRepliesQueueArgs = {
  postId: number;
  username?: string;
};

type categoryQueueArgs = {
  topicId: number;
  categoryId: number;
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
        throw new JobError("Failed to process cacheTopicPostStream job");
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
        throw new JobError("Failed to process cacheTopicComments job");
      }
    }

    if (job.name === "cacheCommentsMap") {
      const { topicId, username } = job.data;
      try {
        const stream = await commentsMapProcessor(topicId, username);

        return { topicId, stream };
      } catch (error) {
        console.error(`Failed to process cacheCommentsMap job: ${error}`);
        throw new JobError("Failed to process cacheCommentsMap job");
      }
    }
    if (job.name === "cacheCommentReplies") {
      const { postId, username } = job.data;
      try {
        const replies = await commentRepliesProcessor(postId, username);

        return { postId, replies };
      } catch (error) {
        console.error(`Failed to process cacheCommentReplies job: ${error}`);
        throw new JobError("Failed to process cacheCommentReplies job");
      }
    }
    if (job.name === "findOrCreateCategory") {
      const { topicId, categoryId } = job.data;
      try {
        const categoryData = await webHookCategoryProcessor(
          topicId,
          categoryId
        );

        return {
          topicId: categoryData.topicId,
          categoryId: categoryData.categoryId,
        };
      } catch (error) {
        console.error(`Failed to process findOrCreateCategory job: ${error}`);
        throw new JobError("Failed to process findOrCreateCategory job");
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

export async function addCommentRepliesRequest({
  postId,
  username,
}: commentRepliesQueueArgs) {
  const jobId = username
    ? `replies-${postId}-${username}`
    : `replies-${postId}`;
  await apiRequestQueue.add(
    "cacheCommentReplies",
    { postId, username },
    { jobId }
  );
}

export async function addCategoryRequest({
  topicId,
  categoryId,
}: categoryQueueArgs) {
  const jobId = `category-${topicId}-${categoryId}`;
  await apiRequestQueue.add(
    "findOrCreateCategory",
    { topicId, categoryId },
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
        throw new JobError(
          `Error handling "completed" event for topicId: ${topicId}`
        );
      }
    }
  }

  if (job.name === "findOrCreateCategory") {
    const { topicId, categoryId } = job.returnvalue;
    console.log(
      `findOrCreateCategory, topicId: ${topicId}, categoryId: ${categoryId}`
    );
  }
});

// Attach an error listener to the worker to prevent NodeJS from raising
// an unhandled exception when an error occurs.
rateLimitedApiWorker.on("error", (error) => {
  console.error(error);
});
