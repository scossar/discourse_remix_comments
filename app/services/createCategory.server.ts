import { fromError } from "zod-validation-error";
import { db } from "~/services/db.server";
import { discourseEnv } from "~/services/config.server";
import {
  type DiscourseApiBasicCategory,
  validateDiscourseApiBasicCategory,
} from "~/schemas/discourseApiResponse.server";
import CategoryCreationError from "~/services/errors/categoryCreationError.server";
import type { Prisma } from "@prisma/client";

export default async function createCategory(id: number) {
  const { apiKey, baseUrl } = discourseEnv();
  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");
  const url = `${baseUrl}/site.json`;
  const response = await fetch(url, {
    headers: headers,
  });
  if (!response.ok) {
    throw new CategoryCreationError(
      "Bad response returned from Discourse when fetching Topic's category",
      response.status
    );
  }

  const data = await response.json();
  const categories = data?.categories;
  if (!categories) {
    throw new CategoryCreationError(
      "API request to Discourse failed to return Topic's category data",
      404
    );
  }

  const foundCategory: DiscourseApiBasicCategory = categories.find(
    (category: DiscourseApiBasicCategory) => category.id === id
  );
  if (!foundCategory) {
    throw new CategoryCreationError(
      "API request to Discourse failed to return Topic's category data",
      404
    );
  }
  let discourseCategory;
  try {
    discourseCategory = validateDiscourseApiBasicCategory(foundCategory);
  } catch (error) {
    const errorMessage = fromError(error).toString();
    throw new CategoryCreationError(errorMessage, 422);
  }

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

  const missingCategory = await db.discourseCategory.create({
    data: categoryFields,
  });

  if (!missingCategory) {
    throw new CategoryCreationError(
      "Unable to create Topic's category on client",
      500
    );
  }

  return missingCategory;
}
