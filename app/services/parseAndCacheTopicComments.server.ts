import { addTopicStreamRequest } from "~/services/jobs/postStreamWorker.server";
export async function parseAndCacheTopicComments(topicId: number) {
  try {
    await addTopicStreamRequest({ topicId: topicId });
  } catch (error) {
    throw new Error("error message needed");
  }
}
