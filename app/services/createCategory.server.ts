import { db } from "~/services/db.server";
import { discourseEnv } from "./config.server";
import { ApiDiscourseCategory } from "~/types/apiDiscourse";
import CategoryCreationError from "./errors/categoryCreationError.server";
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

  const discourseCategory: ApiDiscourseCategory = categories.find(
    (category: ApiDiscourseCategory) => category.id === id
  );
  if (!discourseCategory) {
    throw new CategoryCreationError(
      "API request to Discourse failed to return Topic's category data",
      404
    );
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
