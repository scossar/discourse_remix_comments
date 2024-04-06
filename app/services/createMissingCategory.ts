import { db } from "~/services/db.server";
import { Category } from "~/types/discourse";
import type { Prisma } from "@prisma/client";

export default async function createMissingCategory(id: number) {
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    return 0;
  }

  const apiKey = process.env.DISCOURSE_API_KEY;
  const baseUrl = process.env.DISCOURSE_BASE_URL;

  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", "system");
  const url = `${baseUrl}/site.json`;
  const response = await fetch(url, {
    headers: headers,
  });
  if (response.ok) {
    return 0;
  }

  const data = await response.json();
  const categories = data?.categories;
  if (!categories) {
    return 0;
  }

  const discourseCategory: Category = categories.find(
    (category: Category) => category.id === id
  );
  if (!discourseCategory) {
    return 0;
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
    return 0;
  }

  return missingCategory;
}
