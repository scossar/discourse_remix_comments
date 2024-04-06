import { json, type ActionFunctionArgs } from "@remix-run/node";

import { db } from "~/services/db.server";
import { Prisma } from "@prisma/client";

import type { WebHookTopic, Topic } from "~/types/discourse";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks";

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return json({ message: "Invalid request method" });
  }

  const receivedHeaders: Headers = request.headers;
  const discourseHeaders = discourseWehbookHeaders(receivedHeaders);

  if (
    discourseHeaders["X-Discourse-Event-Type"] !== "topic" ||
    (discourseHeaders["X-Discourse-Event"] !== "topic_created" &&
      discourseHeaders["X-Discourse-Event"] !== "topic_edited")
  ) {
    console.warn(
      `Webhook Error: route not configured to handle ${discourseHeaders["X-Discourse-Event-Type"]} ${discourseHeaders["X-Discourse-Event"]}`
    );
    return json(
      {
        message: `Payload URL not configured to handle ${discourseHeaders["X-Discourse-Event-Id"]} event`,
      },
      403
    );
  }

  const webhookJson: WebHookTopic = await request.json();

  const eventSignature = discourseHeaders["X-Discourse-Event-Signature"];

  const validSig = eventSignature
    ? verifyWebhookRequest(JSON.stringify(webhookJson), eventSignature)
    : false;

  if (validSig) {
    console.warn(
      `Webhook Error: invalid or missing event signature for event-id ${discourseHeaders["X-Discourse-Event-Id"]} `
    );
    return json(
      {
        message: `Payload Signature mismatch`,
      },
      403
    );
  }

  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    console.warn(
      "Webhook Error: DISCOURSE_BASE_URL environmental variable not set"
    );
    return json({
      message: "Webhook environmental variables not configured on client",
    });
  }

  return null;
  /*


  const baseUrl = process.env.DISCOURSE_BASE_URL;
  const apiKey = process.env.DISCOURSE_API_KEY;
  const topicId = jsonData?.topic?.id;
  const slug = jsonData?.topic?.slug;

  const requestHeaders = new Headers();
  requestHeaders.append("Api-Key", apiKey);
  requestHeaders.append("Api-Username", "system");
  const topicUrl = `${baseUrl}/t/${slug}/${topicId}.json`;
  const response = await fetch(topicUrl, { headers: requestHeaders });

  if (!response.ok) {
    throw new Response("Failed to fetch topic", {
      status: response.status,
      statusText: response.statusText,
    });
  }

  const topicData = await response.json();

  const categoryId = topicData.category_id;

  const category = await db.discourseCategory.findUnique({
    where: { externalId: categoryId },
  });

  if (!category) {
    const categoriesUrl = `${baseUrl}/categories.json?include_subcategories=true`;
    const categoriesResponse = await fetch(categoriesUrl, {
      headers: requestHeaders,
    });
    if (!categoriesResponse.ok) {
      throw new Response("Failed to fetch categories", {
        status: categoriesResponse.status,
        statusText: categoriesResponse.statusText,
      });
    }
    const categoryData = await categoriesResponse.json();
    const categories = categoryData.category_list.categories;
    // note this isn't looking for subcategories
    const missingCategory = categories.find(
      (cat: any) => cat.id === categoryId
    );

    let categoryFields: Prisma.DiscourseCategoryCreateInput = {
      externalId: Number(missingCategory.id),
      name: missingCategory.name,
      color: missingCategory.color,
      slug: missingCategory.slug,
      description: missingCategory.description,
      hasChildren: Boolean(missingCategory.hasChildren),
      readRestricted: Boolean(missingCategory.read_restricted),
      parentCategoryId:
        missingCategory.parent_category_id !== null
          ? Number(missingCategory.parent_category_id)
          : null,
    };

    const newCategory = await db.discourseCategory.create({
      data: categoryFields,
    });
  }

  const topicPost = topicData.post_stream.posts[0];

  const topicFields: Prisma.DiscourseTopicCreateInput = {
    externalId: Number(topicData.id),
    slug: topicData.slug,
    fancyTitle: topicData.fancy_title,
    archetype: topicData.archetype,
    externalCreatedAt: new Date(topicData.created_at),
    user: {
      connectOrCreate: {
        where: {
          externalId: Number(topicData.user_id),
        },
        create: {
          externalId: Number(topicData.user_id),
          username: topicPost.username,
          avatarTemplate: topicPost.avatar_template,
        },
      },
    },
    category: {
      connect: { externalId: Number(topicData.category_id) },
    },
  };

  //const topic = await db.discourseTopic.create({ data: topicFields });

  // note: probably don't use upsert for new topic webhooks, use it for updated topics though.
  const topic = await db.discourseTopic.upsert({
    where: {
      externalId: topicFields.externalId,
    },
    update: {
      ...topicFields,
    },
    create: {
      ...topicFields,
    },
  });

  const postFields: Prisma.DiscoursePostCreateInput = {
    externalId: Number(topicPost.id),
    topic: {
      connect: { externalId: topicPost.topic_id },
    },
    user: {
      connect: { externalId: topicPost.user_id },
    },
    username: topicPost.username,
    avatarTemplate: topicPost.avatar_template,
    postNumber: topicPost.post_number,
    postType: topicPost.post_type,
    cooked: topicPost.cooked,
    externalCreatedAt: new Date(topicPost.created_at),
    externalUpdatedAt: new Date(topicPost.updated_at),
  };

  const post = await db.discoursePost.create({ data: postFields });

  // console.log(`topic: ${JSON.stringify(topic, null, 2)}`);

  //console.log(`post: ${JSON.stringify(post, null, 2)}`);
  return json({ status: 200 }); */
};
