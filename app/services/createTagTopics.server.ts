import { db } from "~/services/db.server";
import { throwPrismaError } from "~/services/errors/handlePrismaError.server";

export default async function createTagTopics(
  tagIds: number[],
  topicDatabaseId: number
) {
  const topicTags = tagIds.map((tagId) => {
    try {
      db.discourseTopicTag.upsert({
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
      });
    } catch (error) {
      throwPrismaError(error);
    }
  });

  try {
    await Promise.all(topicTags);
  } catch (error) {
    throwPrismaError(error);
  }
}
