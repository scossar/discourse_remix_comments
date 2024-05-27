import { forwardRef, useRef, useState } from "react";
import { useFetcher } from "@remix-run/react";

import ReplyButton from "./ReplyButton";
import EditorIcon from "./ZalgEditor/EditorIcon";

import type {
  ParsedDiscoursePost,
  ParsedDiscourseCommentReplies,
} from "~/types/parsedDiscourse";
import Avatar from "~/components/Avatar";

export type CommentProps = {
  post: ParsedDiscoursePost;
  handleReplyClick: (postNumber: string) => void;
  handleJumpToPost: (postNumber: number, postId: number) => void;
};

const Comment = forwardRef<HTMLDivElement, CommentProps>(function Comment(
  { post, handleReplyClick, handleJumpToPost },
  ref
) {
  const replyKey = String(post.postNumber);
  const replyFetcher = useFetcher<ParsedDiscourseCommentReplies>({
    key: replyKey,
  });
  const postNumber = String(post.postNumber) || "";
  const replyCount = post.replyCount;
  const replyText = replyCount === 1 ? "reply" : "replies";
  const [postRepliesOpen, setPostRepliesOpen] = useState(false);
  const repliesLoadedRef = useRef(false);

  function getRepliesForPost(postId: number) {
    if (!repliesLoadedRef.current) {
      replyFetcher.load(`/api/cachedCommentReplies?postId=${postId}`);
    }
    repliesLoadedRef.current = true;
  }

  function handleCommentRepliesClick(postId: number) {
    setPostRepliesOpen(!postRepliesOpen);
    getRepliesForPost(postId);
  }

  return (
    <div className="flex flex-col discourse-comment" id={`post-id-${post.id}`}>
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
            <div dangerouslySetInnerHTML={{ __html: post.cooked }} />{" "}
          </div>{" "}
          {replyCount > 0 && (
            <div className="mr-6">
              <button onClick={() => handleCommentRepliesClick(post.id)}>
                {`${replyCount} ${replyText}`}
                <EditorIcon
                  id={postRepliesOpen ? "caret-up" : "caret-down"}
                  className="inline-block w-4 h-4"
                />
              </button>
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
      {replyFetcher.data?.repliesForPostId === post.id && (
        <div
          className={`flex flex-col w-full pl-6 my-6 border border-cyan-600 ${
            postRepliesOpen ? "block" : "hidden"
          }`}
        >
          {replyFetcher.data.posts.map((replyPost) => (
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
                  <div dangerouslySetInnerHTML={{ __html: replyPost.cooked }} />
                  <button
                    onClick={() =>
                      handleJumpToPost(replyPost.postNumber, replyPost.id)
                    }
                  >
                    Jump to post
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default Comment;
