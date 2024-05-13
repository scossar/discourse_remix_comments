import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { usePageContext } from "~/hooks/usePageContext";
import type {
  ParsedDiscoursePost,
  ParsedPagedDiscoursePosts,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import Comment from "~/components/Comment";
import ZalgEditorClientOnly from "~/components/ZalgEditorClientOnly";
export type CommentFetcherData = { comments: ParsedDiscourseTopicComments };

type CommentsProps = {
  topicId: number;
  commentsCount: number;
};

export default function Comments({ topicId, commentsCount }: CommentsProps) {
  const commentFetcher = useFetcher<CommentFetcherData>({
    key: "commentFetcher",
  });
  const { page, setPage } = usePageContext();
  // loadedPages will track what pages have been loaded.
  // probably add a previousPage param to ParsedDiscourseTopicComments
  // then use intersectional-observer to load pages...
  // page can be null. this might be a problem:
  const [loadedPages, setLoadedPages] = useState<number[]>([page ? page : 0]);
  const [posts, setPosts] = useState<ParsedPagedDiscoursePosts | null>(null);
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

  // TODO: setPage is no longer being called to update the page.
  useEffect(() => {
    if (commentFetcher.data?.comments.pagedPosts) {
      const pagedPosts = commentFetcher.data.comments.pagedPosts;
      setPosts((prevPosts) => {
        const updatedPosts = { ...prevPosts };
        Object.entries(pagedPosts).forEach(([page, posts]) => {
          const pageKey = Number(page);
          if (!isNaN(pageKey)) {
            updatedPosts[pageKey] = posts;
          }
        });
        return updatedPosts;
      });
      setPage(commentFetcher.data.comments.nextPage);
    }
  }, [commentFetcher.data, setPage]);

  const toggleEditorOpen = () => {
    setEditorOpen(!editorOpen);
  };

  const renderComments = useMemo(() => {
    function handleJumpToPost(postNumber: number) {
      const requiredPage = Math.floor(postNumber / 20);
      commentFetcher.load(
        `/api/getTopicComments?topicId=${topicId}&page=${requiredPage}`
      );
    }

    const handleReplyClick = (postNumber: string) => {
      setReplyToPostNumber(postNumber);
      setEditorOpen(true);
    };

    return (
      <div className="divide-y divide-cyan-800">
        {posts &&
          Object.keys(posts)
            .sort((a, b) => Number(a) - Number(b))
            .map((page) => {
              const pageKey = Number(page);
              if (!isNaN(pageKey)) {
                return posts[pageKey].map(
                  (post: ParsedDiscoursePost, index: number) => {
                    const firstOfPage = index === 0;
                    const lastOfPage = index === posts[pageKey].length - 1;
                    return (
                      <Comment
                        key={post.id}
                        post={post}
                        handleReplyClick={handleReplyClick}
                        handleJumpToPost={handleJumpToPost}
                      />
                    );
                  }
                );
              }
            })}
      </div>
    );
  }, [posts, commentFetcher, topicId]);

  return (
    <div className="pt-6">
      <div className="flex justify-between">
        {commentsCount > 0 && (
          <button
            className="px-2 py-1 text-blue-700 bg-white"
            onClick={getTopicCommentsForPage}
          >
            Load Comments
          </button>
        )}
        <button
          className="px-2 py-1 text-blue-700 bg-white"
          onClick={() => setEditorOpen(true)}
        >
          Comment
        </button>
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
