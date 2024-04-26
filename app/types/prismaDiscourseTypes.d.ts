import { Prisma } from "@prisma/client";

export type FullDiscourseTopic = Prisma.DiscourseTopicGetPayload<{
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
