import { db } from "~/services/db.server";
import TagCreationError from "./errors/tagCreationError.server";

export default async function findOrCreateTags(
  tags: string[],
  descriptions?: Record<string, string>
) {
  let foundOrCreatedTags = [];
  for (let tag of tags) {
    let t = await db.discourseTag.findUnique({
      where: { externalId: tag },
    });
    if (!t) {
      try {
        t = await db.discourseTag.create({
          data: {
            externalId: tag,
            text: tag,
            description: descriptions?.[tag],
          },
        });
      } catch (error) {
        console.error(error);
        throw new TagCreationError(`Unable to find or create tag: ${tag}`);
      }
    }
    foundOrCreatedTags.push(t.id);
  }
  return foundOrCreatedTags;
}
