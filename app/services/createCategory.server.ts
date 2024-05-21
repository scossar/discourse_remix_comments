import { fromError } from "zod-validation-error";
import { ZodError } from "zod";
import { db } from "~/services/db.server";
import { type DiscourseRawEnv, discourseEnv } from "~/services/config.server";
import {
  type DiscourseApiBasicCategory,
  validateDiscourseApiBasicCategory,
} from "~/schemas/discourseApiResponse.server";
import {
  ApiError,
  PrismaError,
  UnknownError,
  ValidationError,
} from "~/services/errors/appErrors.server";
import { throwPrismaError } from "~/services/errors/handlePrismaError.server";
import { type DiscourseCategory, Prisma } from "@prisma/client";

export default async function createCategory(
  categoryId: number
): Promise<DiscourseCategory | undefined> {
  try {
    const categories = await fetchCategories(discourseEnv());
    const foundCategory = findCategory(categoryId, categories);
    const validCategory = validateCategory(foundCategory);

    return await saveCategory(validCategory);
  } catch (error) {
    if (error instanceof ApiError) {
      console.error(`Api error: ${error.message}`);
      throw error;
    } else if (error instanceof ValidationError) {
      console.error(`Validation error: ${error.message}`);
      throw error;
    } else if (error instanceof PrismaError) {
      console.error(`Prisma error: ${error.message}`);
      throw error;
    } else {
      console.error(`unknown error: ${error}`);
      throw new UnknownError("An unknown error occurred");
    }
  }
}

async function fetchCategories(config: DiscourseRawEnv) {
  const { apiKey, baseUrl } = config;
  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");

  const url = `${baseUrl}/site.json`;
  const response = await fetch(url, {
    headers: headers,
  });
  if (!response.ok) {
    throw new ApiError(
      "Bad response returned from Discourse when fetching Topic's category",
      response.status
    );
  }

  const json = await response.json();
  const categories = json?.categories;
  if (!categories) {
    throw new ApiError(
      "API request to Discourse failed to return Topic's category data",
      404
    );
  }

  return categories;
}

function findCategory(
  categoryId: number,
  categories: DiscourseApiBasicCategory[]
) {
  const foundCategory: DiscourseApiBasicCategory | undefined = categories.find(
    (category: DiscourseApiBasicCategory) => category.id === categoryId
  );

  if (!foundCategory) {
    throw new ApiError(
      "API request to Discourse failed to return Topic's category data",
      404
    );
  }

  return foundCategory;
}

function validateCategory(foundCategory: DiscourseApiBasicCategory) {
  try {
    return validateDiscourseApiBasicCategory(foundCategory);
  } catch (error) {
    if (error instanceof ZodError) {
      const errorMessage = fromError(error).toString();
      throw new ValidationError(errorMessage);
    } else {
      throw new ValidationError(
        "Invalid category data returned from Discourse"
      );
    }
  }
}

async function saveCategory(discourseCategory: DiscourseApiBasicCategory) {
  const categoryFields: Prisma.DiscourseCategoryCreateInput = {
    externalId: discourseCategory.id,
    parentCategoryId: discourseCategory.parent_category_id,
    name: discourseCategory.name,
    color: discourseCategory.color,
    slug: discourseCategory.slug,
    topicCount: discourseCategory.topic_count,
    descriptionText: discourseCategory.description_text,
    hasChildren: discourseCategory.has_children,
    uploadedLogo: discourseCategory.uploaded_logo,
    uploadedLogoDark: discourseCategory.uploaded_logo_dark,
  };

  try {
    return await db.discourseCategory.create({ data: categoryFields });
  } catch (error) {
    throwPrismaError(error);
  }
}
