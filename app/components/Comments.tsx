import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { usePageContext } from "~/hooks/usePageContext";
import type {
  ParsedDiscoursePost,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import Comment from "~/components/Comment";
import ZalgEditorClientOnly from "~/components/ZalgEditorClientOnly";
type CommentFetcherData = { comments: ParsedDiscourseTopicComments };

type CommentsProps = {
  topicId: number;
  commentsCount: number;
};

export default function Comments({ topicId, commentsCount }: CommentsProps) {
  const commentFetcher = useFetcher<CommentFetcherData>();
  const { page, setPage } = usePageContext();
  const [posts, setPosts] = useState<ParsedDiscoursePost[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [replyToPostNumber, setReplyToPostNumber] = useState("");

  function getTopicCommentsForPage() {
    if (commentFetcher.state === "idle") {
      const pageParam = page || 0;
      commentFetcher.load(
        `/api/getTopicComments?topicId=${topicId}&page=${pageParam}`
      );
    }
  }

  useEffect(() => {
    if (
      commentFetcher.data?.comments.posts &&
      commentFetcher.data.comments.nextPage !== page
    ) {
      const newPosts = commentFetcher.data.comments.posts;
      const allPosts = posts ? [...posts, ...newPosts] : newPosts;
      setPosts(allPosts);
      setPage(commentFetcher.data.comments.nextPage);
    }
  }, [commentFetcher.data, page, setPage, posts]);

  const handleReplyClick = (postNumber: string) => {
    setReplyToPostNumber(postNumber);
    setEditorOpen(true);
  };

  const toggleEditorOpen = () => {
    setEditorOpen(!editorOpen);
  };

  const renderComments = useMemo(() => {
    return (
      <div className="divide-y divide-cyan-800">
        {posts?.map((post) => {
          return (
            <Comment
              key={post.id}
              post={post}
              handleReplyClick={handleReplyClick}
            />
          );
        })}
      </div>
    );
  }, [posts]);

  return (
    <div>
      <div>
        {commentsCount > 0 && (
          <button onClick={getTopicCommentsForPage}>Load Comments</button>
        )}
      </div>

      <div className={`${editorOpen && "pb-96"}`}>
        {renderComments}
        {posts && page !== null && (
          <div>
            <button
              className="px-2 py-1 ml-10 text-blue-700 bg-white"
              onClick={getTopicCommentsForPage}
            >
              {commentFetcher.state === "idle" ? "Load more" : "Loading..."}
            </button>
          </div>
        )}
      </div>
      <div
        className={`${
          editorOpen ? "block" : "hidden"
        } fixed bottom-0 left-0 right-0`}
      >
        <div
          className={`${
            editorOpen ? "" : ""
          } h-full max-w-screen-md mx-auto bg-slate-50 text-slate-900`}
        >
          <ZalgEditorClientOnly
            toggleOpenState={toggleEditorOpen}
            replyToPostNumber={replyToPostNumber}
          />
        </div>
      </div>
    </div>
  );
}
