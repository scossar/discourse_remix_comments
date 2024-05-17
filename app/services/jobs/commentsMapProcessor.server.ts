import QueueError from "~/services/errors/queueError.server";
import { validateDiscourseApiBasicCommentsMap } from "~/schemas/discourseApiResponse.server";
import type { ParsedDiscourseCommentsMap } from "~/types/parsedDiscourse";
import { fromError } from "zod-validation-error";
import {
  transformParticipant,
  transformUser,
} from "~/services/transformDiscourseDataZod.server";
import { discourseEnv } from "~/services/config.server";
import { getRedisClient } from "~/services/redisClient.server";
import { getCommentsMapKey } from "~/services/redisKeys.server";

export async function commentsMapProcessor(topicId: number, username?: string) {
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", username ?? "system");
  const url = `${baseUrl}/t/-/${topicId}.json`;

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new QueueError(
      `Failed to fetch commentsMap data for topicID: ${topicId}`,
      response.status
    );
  }

  const json = await response.json();

  let commentsMapJson;
  try {
    commentsMapJson = validateDiscourseApiBasicCommentsMap(json);
  } catch (error) {
    const errorMessage = fromError(error).toString();
    throw new QueueError(errorMessage, 422);
  }

  const parsedDiscourseCommentsMap: ParsedDiscourseCommentsMap = {
    id: commentsMapJson.id,
    title: commentsMapJson.title,
    slug: commentsMapJson.slug,
    postsCount: commentsMapJson.posts_count,
    createdAt: commentsMapJson.created_at,
    lastPostedAt: commentsMapJson.last_posted_at,
    likeCount: commentsMapJson.like_count,
    participantCount: commentsMapJson.participant_count,
    details: {
      canCreatePost: commentsMapJson.details?.can_create_post,
      participants: commentsMapJson.details.participants.map((participant) =>
        transformParticipant(participant, baseUrl)
      ),
      createdBy: transformUser(commentsMapJson.details.created_by, baseUrl),
      lastPoster: transformUser(commentsMapJson.details.last_poster, baseUrl),
    },
  };

  try {
    const client = await getRedisClient();
    await client.set(
      getCommentsMapKey(topicId),
      JSON.stringify(parsedDiscourseCommentsMap)
    );
  } catch (error) {
    throw new QueueError(
      `Unable to set Redis commentsMap data for topicId: ${topicId}`
    );
  }
}
