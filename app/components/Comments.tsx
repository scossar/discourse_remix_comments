import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { usePageContext } from "~/hooks/usePageContext";
import type {
  ParsedDiscoursePost,
  ParsedPagedDiscoursePosts,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import Comment from "~/components/Comment";
import ZalgComposer from "~/components/ZalgComposer";
import CommentsGap from "~/components/CommentsGap";
export type CommentFetcherData = ParsedDiscourseTopicComments;

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
  const [nextRef] = useInView({
    threshold: 0,
    delay: 250,
    onChange: handleLastPostInView,
  });
  const [posts, setPosts] = useState<ParsedPagedDiscoursePosts | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [replyToPostNumber, setReplyToPostNumber] = useState("");
  const [scrollToPost, setScrollToPost] = useState<number | null>(null);
  const scrollToRef = useRef<HTMLDivElement | null>(null);

  function getInitialComments() {
    const pageParam = page || 0;
    commentFetcher.load(
      `/api/cachedTopicCommentsForPage?topicId=${topicId}&page=${pageParam}`
    );
  }

  function handleLastPostInView(
    inView: boolean,
    entry: IntersectionObserverEntry
  ) {
    if (inView) {
      const pageInView = Number(entry.target.getAttribute("data-page"));
      const pageData = loadedPages[pageInView];
      if (
        pageData &&
        pageData.nextPage !== null &&
        !posts?.[pageData.nextPage]
      ) {
        const nextPage = pageData.nextPage;
        if (commentFetcher.state === "idle") {
          commentFetcher.load(
            `/api/cachedTopicCommentsForPage?topicId=${topicId}&page=${nextPage}`
          );
        }
      }
    }
  }

  // TODO: need to handle the case of `null` being returned from api.cachedTopicCommentsForPage
  // probably that route should return an object: `{comments: comments || null}`
  // if `comments === null`, retry a few times, then display error message.
  useEffect(() => {
    if (commentFetcher.data?.pagedPosts) {
      const { currentPage, previousPage, nextPage } = commentFetcher.data;
      setLoadedPages((prevLoadedPages) => ({
        ...prevLoadedPages,
        [currentPage]: { nextPage: nextPage, previousPage: previousPage },
      }));
      const pagedPosts = commentFetcher.data.pagedPosts;
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
      setPage(commentFetcher.data.nextPage);
    }
  }, [commentFetcher.data, setLoadedPages, setPosts, setPage]);

  useEffect(() => {
    if (
      scrollToPost &&
      commentFetcher.state === "idle" &&
      scrollToRef?.current &&
      posts
    ) {
      scrollToRef.current.scrollIntoView();
      setScrollToPost(null);
    }
  }, [scrollToPost, setScrollToPost, commentFetcher.state, posts]);

  const toggleEditorOpen = () => {
    setEditorOpen(!editorOpen);
  };

  const renderComments = useMemo(() => {
    function handleJumpToPost(postNumber: number, postId: number) {
      const requiredPage = Math.floor(postNumber / 20);
      commentFetcher.load(
        `/api/cachedTopicCommentsForPage?topicId=${topicId}&page=${requiredPage}`
      );
      setScrollToPost(postId);
    }

    function getCommentsForPage(commentPage: number) {
      if (commentFetcher.state === "idle") {
        commentFetcher.load(
          `/api/cachedTopicCommentsForPage?topicId=${topicId}&page=${commentPage}`
        );
      }
    }

    const handleReplyClick = (postNumber: string) => {
      setReplyToPostNumber(postNumber);
      setEditorOpen(true);
    };

    return (
      <div className="divide-y divide-cyan-800">
        {posts &&
          (() => {
            const maxPageKey = Math.max(...Object.keys(posts).map(Number));
            const elements = [];
            for (let pageKey = 0; pageKey <= maxPageKey; pageKey++) {
              if (posts[pageKey]) {
                elements.push(
                  posts[pageKey].map(
                    (post: ParsedDiscoursePost, index: number) => {
                      const lastOfPage = index === posts[pageKey].length - 1;
                      return (
                        <div
                          key={post.id}
                          ref={
                            scrollToPost && scrollToPost === post.id
                              ? scrollToRef
                              : null
                          }
                        >
                          <div
                            className="w-full h-1"
                            data-page={pageKey}
                            ref={lastOfPage ? nextRef : null}
                          ></div>
                          <Comment
                            post={post}
                            handleReplyClick={handleReplyClick}
                            handleJumpToPost={handleJumpToPost}
                          />
                        </div>
                      );
                    }
                  )
                );
              } else {
                elements.push(
                  <CommentsGap
                    key={`gap-${pageKey}`}
                    missingPage={pageKey}
                    getCommentsForPage={getCommentsForPage}
                    state={commentFetcher.state}
                  />
                );
              }
            }
            return elements;
          })()}
      </div>
    );
  }, [posts, commentFetcher, topicId, nextRef, scrollToPost, setScrollToPost]);

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

      <div className={`${editorOpen && "pb-96"}`}>
        {renderComments}
        <div
          className={`w-full ${
            commentFetcher.state === "loading" ? "h-6 block" : "hidden"
          }`}
        >
          Loading...
        </div>
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
          <ZalgComposer
            toggleOpenState={toggleEditorOpen}
            replyToPostNumber={replyToPostNumber}
          />
        </div>
      </div>
    </div>
  );
}
