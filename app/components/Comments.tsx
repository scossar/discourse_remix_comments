import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
//import { usePageContext } from "~/hooks/usePageContext";
import type {
  ParsedDiscoursePost,
  ParsedPagedDiscoursePosts,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import Comment from "~/components/Comment";
import ZalgEditorClientOnly from "~/components/ZalgEditorClientOnly";
export type CommentFetcherData = { comments: ParsedDiscourseTopicComments };

type LoadedPages = {
  [page: number]: {
    nextPage: number | null;
    previousPage: number | null;
  };
};

type CommentsProps = {
  topicId: number;
  commentsCount: number;
};

export default function Comments({ topicId, commentsCount }: CommentsProps) {
  const commentFetcher = useFetcher<CommentFetcherData>({
    key: "commentFetcher",
  });
  //const { page, setPage } = usePageContext();
  const [loadedPages, setLoadedPages] = useState<LoadedPages>({});
  const [nextRef, lastPostInView] = useInView({ threshold: 0 });
  const [prevRef, firstPostInView] = useInView({ threshold: 0 });
  const [posts, setPosts] = useState<ParsedPagedDiscoursePosts | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [replyToPostNumber, setReplyToPostNumber] = useState("");

  function getInitialComments() {
    if (commentFetcher.state === "idle") {
      //const pageParam = page || 0;
      const pageParam = 0;
      commentFetcher.load(
        `/api/getTopicComments?topicId=${topicId}&page=${pageParam}`
      );
    }
  }

  useEffect(() => {
    function getTopicCommentsForPage(page: number) {
      if (commentFetcher.state === "idle") {
        commentFetcher.load(
          `/api/getTopicComments?topicId=${topicId}&page=${page}`
        );
      }
    }

    if (lastPostInView && posts) {
      console.log(
        `lastPostInView, loadedPages: ${JSON.stringify(loadedPages, null, 2)}`
      );
      const lastPageLoaded = Number(
        Object.keys(posts).sort((a, b) => Number(b) - Number(a))[0]
      );
      const nextPage = loadedPages[lastPageLoaded]?.nextPage;
      if (nextPage !== null && !posts[nextPage]) {
        getTopicCommentsForPage(nextPage);
      }
    }
    if (firstPostInView && posts) {
      console.log(
        `firstPostInView, loadedPages: ${JSON.stringify(loadedPages, null, 2)}`
      );
      const firstPageLoaded = Number(
        Object.keys(posts).sort((a, b) => Number(a) - Number(b))[0]
      );
      const prevPage = loadedPages[firstPageLoaded]?.previousPage;
      if (prevPage !== null && !posts[prevPage]) {
        getTopicCommentsForPage(prevPage);
      }
    }
  }, [
    lastPostInView,
    firstPostInView,
    posts,
    loadedPages,
    commentFetcher,
    topicId,
  ]);

  useEffect(() => {
    if (commentFetcher.data?.comments.pagedPosts) {
      const { page, previousPage, nextPage } = commentFetcher.data.comments;
      setLoadedPages((prevLoadedPages) => ({
        ...prevLoadedPages,
        [page]: { nextPage: nextPage, previousPage: previousPage },
      }));
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
      //setPage(commentFetcher.data.comments.nextPage);
    }
  }, [commentFetcher.data, setLoadedPages]);

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
                        ref={
                          lastOfPage ? nextRef : firstOfPage ? prevRef : null
                        }
                      />
                    );
                  }
                );
              }
            })}
      </div>
    );
  }, [posts, commentFetcher, topicId, nextRef, prevRef]);

  return (
    <div className="pt-6">
      <div className="flex justify-between">
        {commentsCount > 0 && (
          <button
            className="px-2 py-1 text-blue-700 bg-white"
            onClick={getInitialComments}
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

      <div className={`${editorOpen && "pb-96"}`}>{renderComments}</div>
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
