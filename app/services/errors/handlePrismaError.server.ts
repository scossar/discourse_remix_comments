import { Prisma } from "@prisma/client";
import { PrismaError } from "~/services/errors/appErrors.server";

export type PrismaErrorType =
  | typeof Prisma.PrismaClientKnownRequestError
  | typeof Prisma.PrismaClientUnknownRequestError
  | typeof Prisma.PrismaClientRustPanicError
  | typeof Prisma.PrismaClientInitializationError
  | typeof Prisma.PrismaClientValidationError;

export function throwPrismaError(error: PrismaErrorType) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`Prisma error: ${error.message}`);
    throw new PrismaError(`Prisma error: ${error.message}`, error.code);
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    console.error(`Prisma error: ${error.message}`);
    throw new PrismaError(`Prisma validation error: ${error.message}`);
  } else if (
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    console.error(`Prisma error: ${error.message}`);
    throw new PrismaError(`Prisma error: ${error.message}`);
  } else {
    console.error(`Prisma error while attempting to save or update Topic`);
    throw new PrismaError(`Prisma error of unknown type: ${error}`);
  }
}