import { db } from "~/services/db.server";
import TagCreationError from "./errors/tagCreationError.server";

export default async function createTagTopics(
  tagIds: number[],
  topicDatabaseId: number
) {
  const topicTags = tagIds.map((tagId) =>
    db.discourseTopicTag
      .upsert({
        where: {
          tagId_topicId: {
            tagId: tagId,
            topicId: topicDatabaseId,
          },
        },
        update: {
          tagId: tagId,
          topicId: topicDatabaseId,
        },
        create: {
          tagId: tagId,
          topicId: topicDatabaseId,
        },
      })
      .catch((error: any) => {
        throw new TagCreationError(
          `Unable to find or create tag: ${tagId}`,
          500
        );
      })
  );

  try {
    await Promise.all(topicTags);
  } catch (error: any) {
    console.error(error.message);
    throw new TagCreationError(error.message, 500);
  }
}
