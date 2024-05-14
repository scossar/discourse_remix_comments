import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { usePageContext } from "~/hooks/usePageContext";
import type {
  ParsedDiscoursePost,
  ParsedPagedDiscoursePosts,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import Comment from "~/components/Comment";
import ZalgEditorClientOnly from "~/components/ZalgEditorClientOnly";
export type CommentFetcherData = { comments: ParsedDiscourseTopicComments };

type LoadedPages = {
  [currentPage: number]: {
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
  const { page, setPage } = usePageContext();
  const [loadedPages, setLoadedPages] = useState<LoadedPages>({});
  const [nextRef, lastPostInView, lastPostEntry] = useInView({ threshold: 0 });
  const [prevRef, firstPostInView, firstPostEntry] = useInView({
    threshold: 0,
  });
  const [posts, setPosts] = useState<ParsedPagedDiscoursePosts | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [replyToPostNumber, setReplyToPostNumber] = useState("");

  /*function getInitialComments() {
    if (commentFetcher.state === "idle") {
      const pageParam = page || 0;
      // const pageParam = 0;
      commentFetcher.load(
        `/api/getTopicComments?topicId=${topicId}&page=${pageParam}`
      );
    }
  } */

  function getTopicCommentsForPage() {
    if (commentFetcher.state === "idle") {
      const pageParam = page || 0;
      commentFetcher.load(
        `/api/getTopicComments?topicId=${topicId}&page=${pageParam}`
      );
    }
  }

  useEffect(() => {
    function loadTopicCommentsForPage(page: number) {
      console.log(JSON.stringify(loadedPages, null, 2));
      if (commentFetcher.state === "idle") {
        commentFetcher.load(
          `/api/getTopicComments?topicId=${topicId}&page=${page}`
        );
      }
    }

    const handleIntersection = (
      entry: IntersectionObserverEntry,
      isLastPost: boolean
    ) => {
      const pageInView = Number(entry.target.getAttribute("data-page"));
      const pageData = loadedPages[pageInView];
      console.log(`loadedPages: ${JSON.stringify(loadedPages, null, 2)}`);
      console.log(
        `pageData: ${JSON.stringify(
          pageData,
          null,
          2
        )}, pageInView: ${pageInView}`
      );

      if (
        isLastPost &&
        pageData &&
        pageData.nextPage !== null &&
        !posts[pageData.nextPage]
      ) {
        console.log(`nextPage: ${pageData.nextPage}`);
        loadTopicCommentsForPage(pageData.nextPage);
      } else if (
        !isLastPost &&
        pageData &&
        pageData.previousPage !== null &&
        !posts[pageData.previousPage]
      ) {
        loadTopicCommentsForPage(pageData.previousPage);
      }
    };

    if (lastPostInView && lastPostEntry) {
      console.log("last post in view");
      handleIntersection(lastPostEntry, true);
    }
    if (firstPostInView && firstPostEntry) {
      console.log("first post in view");
      handleIntersection(firstPostEntry, false);
    }
  }, [
    lastPostInView,
    firstPostInView,
    lastPostEntry,
    firstPostEntry,
    loadedPages,
    posts,
    commentFetcher,
    topicId,
  ]);

  useEffect(() => {
    if (commentFetcher.data?.comments.pagedPosts) {
      const { currentPage, previousPage, nextPage } =
        commentFetcher.data.comments;
      console.log(
        `currentPage: ${currentPage}, previousPage: ${previousPage}, nextPage: ${nextPage}`
      );
      setLoadedPages((prevLoadedPages) => ({
        ...prevLoadedPages,
        [currentPage]: { nextPage: nextPage, previousPage: previousPage },
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
      setPage(commentFetcher.data.comments.nextPage);
    }
  }, [commentFetcher.data, setLoadedPages, setPosts, setPage]);

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
                      <div
                        key={post.id}
                        data-page={pageKey}
                        ref={
                          lastOfPage ? nextRef : firstOfPage ? prevRef : null
                        }
                      >
                        <Comment
                          post={post}
                          handleReplyClick={handleReplyClick}
                          handleJumpToPost={handleJumpToPost}
                        />
                      </div>
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
