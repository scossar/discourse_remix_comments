import { Job, Worker } from "bullmq";
import { apiRequestQueue } from "~/services/jobs/bullmq.server";
import { connection } from "~/services/redisClient.server";
import { postStreamProcessor } from "~/services/jobs/postStreamProcessor.server";
import { topicCommentsProcessor } from "~/services/jobs/topicCommentsProcessor.server";
import { commentsMapProcessor } from "~/services/jobs/commentsMapProcessor.server";
import { commentRepliesProcessor } from "~/services/jobs/commentRepliesProcessor.server";
import { webHookTopicCategoryProcessor } from "~/services/jobs/webHookTopicCategoryProcessor.server";
import { webHookTopicProcessor } from "~/services/jobs/webHookTopicProcessor.server";
import { webHookTopicPostProcessor } from "~/services/jobs/webHookTopicPostProcessor.server";
import { topicPermissionsProcessor } from "~/services/jobs/topicPermissionsProcessor.server";
import { commentProcessor } from "~/services/jobs/commentProcessor.server";
import { JobError } from "~/services/errors/appErrors.server";
import type {
  DiscourseApiWebHookPost,
  DiscourseApiWebHookTopicPayload,
} from "~/schemas/discourseApiResponse.server";
import { DiscourseTopic } from "@prisma/client";

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

type CommentRepliesQueueArgs = {
  postId: number;
  username?: string;
};

type CategoryQueueArgs = {
  categoryId: number;
  topicPayload: DiscourseApiWebHookTopicPayload;
  topicEdited: boolean;
};

type WebHookTopicQueueArgs = {
  topicPayload: DiscourseApiWebHookTopicPayload;
  topicEdited: boolean;
};

type WebHookTopicPostQueuArgs = {
  topic: DiscourseTopic;
};

type TopicPermissionsQueueArgs = {
  topicId: number;
  username: string;
};

export type CommentProcessorArgs = {
  postWebHookJson: DiscourseApiWebHookPost;
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
    if (job.name === "findOrCreateWebHookTopicCategory") {
      const { categoryId, topicPayload, topicEdited } = job.data;
      try {
        const { payload, edited } = await webHookTopicCategoryProcessor(
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
    if (job.name === "findOrCreateWebHookTopicPost") {
      const { topic } = job.data;
      try {
        await webHookTopicPostProcessor(topic);
      } catch (error) {
        console.error(
          `Failed to process findOrCreateWebHookTopicPost job: ${error}`
        );
        throw new JobError(
          "Failed to process findOrCreateWebHookTopicPost job"
        );
      }
    }
    if (job.name === "setTopicPermissionsForUser") {
      const { topicId, username } = job.data;
      try {
        await topicPermissionsProcessor(topicId, username);
      } catch (error) {
        console.error(
          `Failed to process setTopicPermissionsForUser job: ${error}`
        );
        throw new JobError("Failed to process setTopicPermissionsForUser job");
      }
    }
    if (job.name === "createOrUpdateTopicComment") {
      const postWebHookJson = job.data;
      try {
        await commentProcessor(postWebHookJson);
      } catch (error) {
        console.error(
          `Failed to process createOrUpdateTopicComment job: ${error}`
        );
        throw new JobError("Failed to process createOrUpdateTopicComment job");
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
}: CommentRepliesQueueArgs) {
  const jobId = username
    ? `replies-${postId}-${username}`
    : `replies-${postId}`;
  await apiRequestQueue.add(
    "cacheCommentReplies",
    { postId, username },
    { jobId }
  );
}

export async function addWebHookTopicCategoryRequest({
  categoryId,
  topicPayload,
  topicEdited,
}: CategoryQueueArgs) {
  const jobId = `category-${categoryId}`;
  await apiRequestQueue.add(
    "findOrCreateWebHookTopicCategory",
    { categoryId, topicPayload, topicEdited },
    { jobId }
  );
}

export async function addWebHookTopicRequest({
  topicPayload,
  topicEdited,
}: WebHookTopicQueueArgs) {
  const jobId = `webHookTopic-${topicPayload.topic.id}`;
  await apiRequestQueue.add(
    "findOrCreateWebHookTopic",
    { topicPayload, topicEdited },
    { jobId }
  );
}

export async function addWebHookTopicPostRequest({
  topic,
}: WebHookTopicPostQueuArgs) {
  const jobId = `webHookTopicPost-${topic.id}`;
  await apiRequestQueue.add(
    "findOrCreateWebHookTopicPost",
    { topic },
    { jobId }
  );
}

export async function addCommentRequest({
  postWebHookJson,
}: CommentProcessorArgs) {
  const topicId = postWebHookJson.post.topic_id;
  const postId = postWebHookJson.post.id;
  const jobId = `comment-${topicId}-${postId}`;
  await apiRequestQueue.add(
    "createOrUpdateTopicComment",
    { postWebHookJson },
    { jobId }
  );
}

export async function addTopicPermissionsRequest({
  topicId,
  username,
}: TopicPermissionsQueueArgs) {
  const jobId = `topicPermissions-${topicId}-${username}`;
  await apiRequestQueue.add(
    "setTopicPermissionsForUser",
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
        throw new JobError(
          `Error handling "completed" event for topicId: ${topicId}`
        );
      }
    }
  }

  if (job.name === "findOrCreateWebHookTopicCategory") {
    const { payload, edited } = job.returnvalue;
    if (payload) {
      await addWebHookTopicRequest({
        topicPayload: payload,
        topicEdited: edited,
      });
    }
  }

  if (job.name === "findOrCreateWebHookTopic") {
    const topic = job.returnvalue;
    if (topic) {
      await addWebHookTopicPostRequest({ topic });
    }
  }
});

// Attach an error listener to the worker to prevent NodeJS from raising
// an unhandled exception when an error occurs.
rateLimitedApiWorker.on("error", (error) => {
  console.error(error);
});
