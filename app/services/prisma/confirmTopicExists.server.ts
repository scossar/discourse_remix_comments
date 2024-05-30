import { db } from "~/services/prisma/db.server";
import { throwPrismaError } from "~/services/errors/handlePrismaError.server";

export async function confirmTopicExists(topicId: number) {
  try {
    const savedTopicId = await db.discourseTopic.findUnique({
      where: { externalId: topicId },
      select: { externalId: true },
    });
    return savedTopicId ? true : false;
  } catch (error) {
    throwPrismaError(error);
  }
}
