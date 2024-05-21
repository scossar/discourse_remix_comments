import { Job, Worker } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection } from "~/services/redisClient.server";
import { postStreamProcessor } from "~/services/jobs/postStreamProcessor.server";
import { topicCommentsProcessor } from "~/services/jobs/topicCommentsProcessor.server";
import { commentsMapProcessor } from "~/services/jobs/commentsMapProcessor.server";
import { commentRepliesProcessor } from "~/services/jobs/commentRepliesProcessor.server";
import { webHookCategoryProcessor } from "~/services/jobs/webHookCategoryProcessor.server";
import { webHookTopicProcessor } from "~/services/jobs/webHookTopicProcessor.server";
import { JobError } from "~/services/errors/appErrors.server";
import type { DiscourseApiWebHookTopicPayload } from "~/schemas/discourseApiResponse.server";

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
  categoryId: number;
  topicPayload: DiscourseApiWebHookTopicPayload;
  topicEdited: boolean;
};

type webhookTopicQueueArgs = {
  topicPayload: DiscourseApiWebHookTopicPayload;
  topicEdited: boolean;
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
      const { categoryId, topicPayload, topicEdited } = job.data;
      try {
        const { payload, edited } = await webHookCategoryProcessor(
          categoryId,
          topicPayload,
          topicEdited
        );
        return { payload, edited };
      } catch (error) {
        console.error(`Failed to process findOrCreateCategory job: ${error}`);
        throw new JobError("Failed to process findOrCreateCategory job");
      }
    }
    if (job.name === "findOrCreateWebHookTopic") {
      const { topicPayload, topicEdited } = job.data;
      try {
        return await webHookTopicProcessor(topicPayload, topicEdited);
      } catch (error) {
        console.error(
          `Failed to process findOrCreateWebHookTopic job: ${error}`
        );
        throw new JobError("Failed to process findOrCreateWebHookTopic job");
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
  categoryId,
  topicPayload,
  topicEdited,
}: categoryQueueArgs) {
  const jobId = `category-${categoryId}`;
  await apiRequestQueue.add(
    "findOrCreateCategory",
    { categoryId, topicPayload, topicEdited },
    { jobId }
  );
}

export async function addWebHookTopicRequest({
  topicPayload,
  topicEdited,
}: webhookTopicQueueArgs) {
  const jobId = `webhookTopic-${topicPayload.topic.id}`;
  await apiRequestQueue.add(
    "findOrCreateWebHookTopic",
    { topicPayload, topicEdited },
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
    const { payload, edited } = job.returnvalue;
    if (payload) {
      await addWebHookTopicRequest({
        topicPayload: payload,
        topicEdited: edited,
      });
    }
  }

  if (job.name === "findOrCreateWebHookTopic") {
    const { topic, payload } = job.returnvalue;
    console.log(
      `topic: ${JSON.stringify(topic, null, 2)}, payload: ${JSON.stringify(
        payload,
        null,
        2
      )}`
    );
  }
});

// Attach an error listener to the worker to prevent NodeJS from raising
// an unhandled exception when an error occurs.
rateLimitedApiWorker.on("error", (error) => {
  console.error(error);
});
