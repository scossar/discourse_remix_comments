import { fromError } from "zod-validation-error";
import AppError from "~/services/errors/AppError.server";
import { discourseEnv } from "./config.server";

import type { ParsedDiscourseTopicMap } from "~/types/parsedDiscourse";
import { validateDiscourseApiBasicTopicMap } from "~/schemas/discourseApiResponse.server";
import {
  transformParticipant,
  transformUser,
} from "./transformDiscourseDataZod.server";
export async function fetchCommentMapData(
  topicId: number,
  currentUsername?: string
): Promise<ParsedDiscourseTopicMap> {
  const { apiKey, baseUrl } = discourseEnv();

  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", currentUsername ? currentUsername : "system");
  const url = `${baseUrl}/t/-/${topicId}.json`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new AppError(
      "Failed to fetch TopicMap data",
      "TopicMapDataError",
      response.status
    );
  }

  const responseJson = await response.json();

  let topicMapJson;
  try {
    topicMapJson = validateDiscourseApiBasicTopicMap(responseJson);
  } catch (error) {
    const errorMessage = fromError(error).toString();
    throw new AppError(errorMessage, "TopicMapDataError", 422);
  }

  return {
    id: topicMapJson.id,
    title: topicMapJson.title,
    slug: topicMapJson.slug,
    postsCount: topicMapJson.posts_count,
    createdAt: topicMapJson.created_at,
    lastPostedAt: topicMapJson.last_posted_at,
    likeCount: topicMapJson.like_count,
    participantCount: topicMapJson.participant_count,
    details: {
      canCreatePost: topicMapJson.details.can_create_post,
      participants: topicMapJson.details.participants.map((participant) =>
        transformParticipant(participant, baseUrl)
      ),
      createdBy: transformUser(topicMapJson.details.created_by, baseUrl),
      lastPoster: transformUser(topicMapJson.details.last_poster, baseUrl),
    },
  };
}
