import { json, type ActionFunctionArgs } from "@remix-run/node";

import { db } from "~/services/db.server";
import type { Prisma } from "@prisma/client";

import type { WebHookTopic, Category } from "~/types/discourse";
import {
  discourseWehbookHeaders,
  verifyWebhookRequest,
} from "~/services/discourseWebhooks";
import createMissingCategory from "~/services/createMissingCategory";

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

  if (!validSig) {
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
    return json(
      {
        message: "Webhook environmental variables not configured on client",
      },
      500
    );
  }

  const categoryId = webhookJson.topic.category_id;
  let category = await db.discourseCategory.findUnique({
    where: { externalId: categoryId },
  });

  if (!category) {
    const newCategory = await createMissingCategory(categoryId);
    if (newCategory === 0) {
      return json(
        {
          message: "Unable to create category",
        },
        500
      );
    }
    console.log(`new cat: ${JSON.stringify(newCategory, null, 2)}`);
  }

  return null;

  /*
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
  
  return json({ status: 200 });
  */
};
