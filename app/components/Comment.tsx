import { forwardRef } from "react";

import ReplyButton from "./ReplyButton";

import type { ParsedDiscoursePost } from "~/types/parsedDiscourse";
import Avatar from "~/components/Avatar";

export type CommentProps = {
  post: ParsedDiscoursePost;
  handleReplyClick: (postNumber: string) => void;
};

const Comment = forwardRef<HTMLDivElement, CommentProps>(function Comment(
  { post, handleReplyClick },
  ref
) {
  const postNumber = String(post.postNumber) || "";
  return (
    <div className="flex my-6 discourse-comment" ref={ref}>
      <Avatar
        user={{
          username: post.username,
          avatarTemplate: post.avatarUrl,
        }}
        absoluteUrl={true}
        className="object-contain w-8 h-8 mt-2 rounded-full"
      />
      <div className="w-full ml-2">
        <div className="w-full my-3">
          <span className="inline-block p-1 text-sm text-slate-50">
            {post.postNumber}
          </span>
          <div dangerouslySetInnerHTML={{ __html: post.cooked }} />
        </div>
        <div className="flex items-center justify-end w-full">
          <ReplyButton
            handleReplyClick={handleReplyClick}
            postNumber={postNumber}
          />
        </div>
      </div>
    </div>
  );
});

export default Comment;
