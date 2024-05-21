import { db } from "~/services/db.server";
import createCategory from "~/services/createCategory.server";
import {
  ApiError,
  ValidationError,
  PrismaError,
  UnknownError,
  JobError,
} from "~/services/errors/appErrors.server";

export async function webHookCategoryProcessor(
  topicId: number,
  categoryId: number
) {
  let category;
  try {
    category = await db.discourseCategory.findUnique({
      where: { externalId: categoryId },
    });
    if (!category) {
      category = await createCategory(categoryId);
    }
    return { topicId, categoryId };
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
