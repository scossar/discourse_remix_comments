import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import type {
  ParsedDiscoursePost,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import Comment from "~/components/Comment";
//import CommentForm from "~/components/CommentForm";
import ZalgEditorClientOnly from "~/components/ZalgEditorClientOnly";
type CommentFetcherData = { comments: ParsedDiscourseTopicComments };

type CommentsProps = {
  topicId: number;
};

export default function Comments({ topicId }: CommentsProps) {
  const commentFetcher = useFetcher<CommentFetcherData>();
  const [page, setPage] = useState<number | null>(null);
  const [posts, setPosts] = useState<ParsedDiscoursePost[] | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [replyToPostNumber, setReplyToPostNumber] = useState("");

  function getInitialComments() {
    if (commentFetcher.state === "idle" && page === null) {
      const page = 0;
      const commentUrl = `/api/getTopicComments?page=${page}&topicId=${topicId}`;
      commentFetcher.load(commentUrl);
    }
  }

  function loadMoreComments() {
    if (commentFetcher.state === "idle" && page) {
      const commentUrl = `/api/getTopicComments?page=${page}&topicId=${topicId}`;
      commentFetcher.load(commentUrl);
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
  }, [commentFetcher.data, page, posts]);

  const handleReplyClick = (postNumber: string) => {
    setReplyToPostNumber(postNumber);
    setEditorOpen(true);
  };

  const handleCreatePostClick = () => {
    setEditorOpen(false);
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
      <button onClick={getInitialComments}>Comments</button>

      <div className={`${editorOpen && "pb-96"}`}>
        {renderComments}
        {page && (
          <div>
            <button
              className="px-2 py-1 ml-10 text-blue-700 bg-white"
              onClick={loadMoreComments}
            >
              {commentFetcher.state === "idle" ? "Load more" : "Loading..."}
            </button>
          </div>
        )}
      </div>
      <div
        className={`${
          editorOpen ? "h-96" : "hidden"
        } fixed bottom-0 left-0 right-0`}
      >
        <div
          className={`${
            editorOpen ? "" : ""
          } h-full max-w-screen-md mx-auto bg-slate-50 text-slate-900`}
        >
          <ZalgEditorClientOnly />
        </div>
      </div>
    </div>
  );
}
