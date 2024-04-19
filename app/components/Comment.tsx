import { forwardRef, memo } from "react";

import ReplyButton from "./ReplyButton";

import type { ParsedDiscoursePost } from "~/types/parsedDiscourse";
import Avatar from "~/components/Avatar";

export type CommentProps = {
  post: ParsedDiscoursePost;
};

const Comment = memo(
  forwardRef<HTMLDivElement, CommentProps>(({ post }, ref) => {
    return (
      <div className="my-6 discourse-comment flex" ref={ref}>
        <Avatar
          user={{
            username: post.username,
            avatarTemplate: post.avatarUrl,
          }}
          absoluteUrl={true}
          className="rounded-full w-8 h-8 object-contain mt-2"
        />
        <div className="ml-2 w-full">
          <div className="w-full my-3">
            <span className=" text-slate-50 text-sm inline-block p-1">
              {post.postNumber}
            </span>
            <div dangerouslySetInnerHTML={{ __html: post.cooked }} />
          </div>
          <div className="flex justify-end w-full items-center">
            <ReplyButton />
          </div>
        </div>
      </div>
    );
  })
);

export default Comment;
