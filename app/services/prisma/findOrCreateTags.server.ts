import { db } from "~/services/prisma/db.server";
import { throwPrismaError } from "~/services/errors/handlePrismaError.server";

export default async function findOrCreateTags(
  tags: string[],
  descriptions?: Record<string, string>
) {
  try {
    const foundOrCreatedTags = [];
    for (const tag of tags) {
      let t = await db.discourseTag.findUnique({
        where: { externalId: tag },
      });
      if (!t) {
        t = await db.discourseTag.create({
          data: {
            externalId: tag,
            text: tag,
            description: descriptions?.[tag],
          },
        });
      }
      foundOrCreatedTags.push(t.id);
    }
    return foundOrCreatedTags;
  } catch (error) {
    throwPrismaError(error);
  }
}
