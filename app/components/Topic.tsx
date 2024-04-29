import {
  JsonifiedDiscourseTag,
  JsonifiedDiscourseArticle,
} from "~/types/prismaDiscourseTypes";

import Avatar from "./Avatar";

interface ArticleProps {
  topic: JsonifiedDiscourseArticle;
}

// tmp fix:
import type { DiscourseUser } from "@prisma/client";

function absolutizeAvatarTemplateForUser(user: DiscourseUser, baseUrl: string) {
  if (!/^https?:\/\//i.test(user.avatarTemplate)) {
    user.avatarTemplate = generateAvatarUrl(user.avatarTemplate, baseUrl);
  }
  return user;
}

function generateAvatarUrl(
  avatarTemplate: string,
  discourseBaseUrl: string,
  size = "48"
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${discourseBaseUrl}${sized}`;
}
// end tmp fix

export default function Topic({ topic }: ArticleProps) {
  // tmp fix. REMOVE THIS!!!
  const baseUrl = "http://localhost:4200";
  const user = absolutizeAvatarTemplateForUser(topic.user, baseUrl);
  const categoryColor = topic?.category?.color
    ? `#{topic.category.color}`
    : "#ffffff";

  return (
    <>
      <header className="pb-3 border-b border-cyan-800">
        <h1 className="text-3xl">{topic.title}</h1>
        <div className="flex items-center text-sm">
          <div
            style={{ backgroundColor: `${categoryColor}` }}
            className={`inline-block p-2 mr-1`}
          ></div>
          <span className="pr-1">{topic.category?.name}</span>
          <span>
            {topic?.tags.map((topicTag: JsonifiedDiscourseTag) => (
              <span key={topicTag.tagId} className="px-1">
                {topicTag.tag.text}
              </span>
            ))}
          </span>
        </div>
      </header>
      <article className="flex py-3 border-b discourse-op border-cyan-800">
        <Avatar
          user={user}
          className="object-contain w-10 h-10 mt-3 rounded-full"
        />
        <div className="ml-2">
          {topic?.post?.cooked && (
            <div dangerouslySetInnerHTML={{ __html: topic.post.cooked }} />
          )}
        </div>
      </article>
    </>
  );
}
