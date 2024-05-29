import { db } from "~/services/prisma/db.server";
import createCategory from "~/services/prisma/createCategory.server";
import type { DiscourseApiWebHookTopicPayload } from "~/schemas/discourseApiResponse.server";
import {
  ApiError,
  ValidationError,
  PrismaError,
  UnknownError,
  JobError,
} from "~/services/errors/appErrors.server";

export async function webHookTopicCategoryProcessor(
  categoryId: number,
  topicPayload: DiscourseApiWebHookTopicPayload,
  topicEdited: boolean
) {
  let category;
  try {
    category = await db.discourseCategory.findUnique({
      where: { externalId: categoryId },
    });
    if (!category) {
      category = await createCategory(categoryId);
    }
    return { payload: topicPayload, edited: topicEdited };
  } catch (error) {
    let errorMessage = "Unknown error";
    if (
      error instanceof ApiError ||
      error instanceof ValidationError ||
      error instanceof PrismaError ||
      error instanceof UnknownError
    ) {
      errorMessage = error.message;
    }
    throw new JobError(errorMessage);
  }
}
