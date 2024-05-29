import { db } from "~/services/prisma/db.server";
import { DiscourseTopic } from "@prisma/client";
import createOrUpdateOp from "~/services/prisma/createOrUpdateOp.server";
import {
  ApiError,
  JobError,
  PrismaError,
} from "~/services/errors/appErrors.server";
import { ZodError } from "zod";
import { fromError } from "zod-validation-error";

export async function webHookTopicPostProcessor(topic: DiscourseTopic) {
  let post;
  try {
    post = await db.discoursePost.findUnique({
      where: { topicId: topic.externalId },
    });
    if (!post) {
      await createOrUpdateOp(topic.externalId);
    }
  } catch (error) {
    let errorMessage = "Unknown error";
    if (error instanceof ApiError || error instanceof PrismaError) {
      errorMessage = error.message;
    } else if (error instanceof ZodError) {
      errorMessage = fromError(error).toString();
    }

    throw new JobError(errorMessage);
  }
}
