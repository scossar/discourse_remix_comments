import { forwardRef } from "react";
import { useFetcher } from "@remix-run/react";

import ReplyButton from "./ReplyButton";

import type {
  ParsedDiscoursePost,
  ParsedDiscourseCommentReplies,
} from "~/types/parsedDiscourse";
import Avatar from "~/components/Avatar";

export type CommentProps = {
  post: ParsedDiscoursePost;
  handleReplyClick: (postNumber: string) => void;
};

const Comment = forwardRef<HTMLDivElement, CommentProps>(function Comment(
  { post, handleReplyClick },
  ref
) {
  const replyKey = String(post.postNumber);
  const replyFetcher = useFetcher<ParsedDiscourseCommentReplies>({
    key: replyKey,
  });
  const postNumber = String(post.postNumber) || "";
  const replyCount = post.replyCount;
  const replyText = replyCount === 1 ? "reply" : "replies";

  function getRepliesForPost(postId: number) {
    replyFetcher.load(`/api/discourseRepliesForPost?postId=${postId}`);
  }

  return (
    <div className="flex flex-col discourse-comment">
      <div className="flex w-full my-6" ref={ref}>
        <Avatar
          user={{
            username: post.username,
            avatarTemplate: post.avatarUrl,
          }}
          className="object-contain w-8 h-8 mt-2 rounded-full"
        />
        <div className="w-full ml-2">
          <div className="w-full my-3">
            <span className="inline-block p-1 text-sm text-slate-50">
              {post.postNumber}
            </span>
            <div dangerouslySetInnerHTML={{ __html: post.cooked }} />
          </div>
          {replyCount > 0 && (
            <div className="mr-6">
              <button
                onClick={() => getRepliesForPost(post.id)}
              >{`${replyCount} ${replyText}`}</button>
            </div>
          )}
          <div className="flex items-center justify-end reply-button">
            <ReplyButton
              handleReplyClick={handleReplyClick}
              postNumber={postNumber}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col w-full pl-6 my-6 border border-cyan-600">
        {replyFetcher.data &&
          replyFetcher.data?.posts &&
          replyFetcher.data.posts.map(
            (replyPost) =>
              replyPost.replyToPostNumber === post.postNumber && (
                <div
                  key={`${replyPost.id}-${replyPost.replyToPostNumber}`}
                  className="flex my-6"
                >
                  <Avatar
                    user={{
                      username: replyPost.username,
                      avatarTemplate: replyPost.avatarUrl,
                    }}
                    className="object-contain w-8 h-8 mt-2 rounded-full"
                  />
                  <div className="w-full ml-2">
                    <div className="w-full my-3">
                      <span className="inline-block p-1 text-sm text-slate-50">
                        {replyPost.postNumber}
                      </span>
                      <div
                        dangerouslySetInnerHTML={{ __html: replyPost.cooked }}
                      />
                    </div>
                    {replyPost.replyCount > 0 && (
                      <div className="mr-6">
                        <button
                          onClick={() => getRepliesForPost(replyPost.id)}
                        >{`${replyPost.replyCount} ${
                          replyPost.replyCount === 1 ? "reply" : "replies"
                        }`}</button>
                      </div>
                    )}
                    <div className="flex items-center justify-end">
                      <ReplyButton
                        handleReplyClick={handleReplyClick}
                        postNumber={String(replyPost.postNumber)}
                      />
                    </div>
                  </div>
                </div>
              )
          )}
      </div>
    </div>
  );
});

export default Comment;
