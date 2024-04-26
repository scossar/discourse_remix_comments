import { Prisma } from "@prisma/client";

export type DiscourseArticle = Prisma.DiscourseTopicGetPayload<{
  include: {
    user: true;
    category: true;
    post: {
      where: {
        postNumber: 1;
      };
    };
    tags: {
      include: {
        tag: true;
      };
    };
  };
}>;

export type JsonifiedDiscourseArticle = JsonifyObject<DiscourseArticle>;

export type JsonifiedDiscourseTag = JsonifyObject<Prisma.DiscourseTag>;
