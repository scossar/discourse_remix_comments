import { Prisma } from "@prisma/client";
import { PrismaError } from "~/services/errors/appErrors.server";

export function throwPrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`Prisma known request error: ${error.message}`, {
      code: error.code,
    });
    throw new PrismaError(
      `Prisma known request error: ${error.message}`,
      error.code
    );
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    console.error(`Prisma validation error: ${error.message}`);
    throw new PrismaError(`Prisma validation error: ${error.message}`);
  } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    console.error(`Prisma unknown request error: ${error.message}`);
    throw new PrismaError(`Prisma unknown request error: ${error.message}`);
  } else if (error instanceof Prisma.PrismaClientRustPanicError) {
    console.error(`Prisma rust panic error: ${error.message}`);
    throw new PrismaError(`Prisma rust panic error: ${error.message}`);
  } else if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error(`Prisma initialization error: ${error.message}`);
    throw new PrismaError(`Prisma initialization error: ${error.message}`);
  } else {
    console.error(`Unknown Prisma error: ${error}`);
    throw new PrismaError(`Prisma error of unknown type: ${error}`);
  }
}
