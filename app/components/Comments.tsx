import { useFetcher, useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import debounce from "debounce";
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
  const [nextRef, lastPostInView, lastPostEntry] = useInView({
    threshold: 0,
    onChange: handleLastPostInView,
  });
  const [prevRef, firstPostInView, firstPostEntry] = useInView({
    threshold: 0,
    onChange: handleFirstPostInView,
  });
  const [posts, setPosts] = useState<ParsedPagedDiscoursePosts | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [replyToPostNumber, setReplyToPostNumber] = useState("");
  const [scrollToPost, setScrollToPost] = useState<string | null>(null);
  const navigate = useNavigate();

  function getInitialComments() {
    if (commentFetcher.state === "idle") {
      const pageParam = page || 0;
      commentFetcher.load(
        `/api/getTopicComments?topicId=${topicId}&page=${pageParam}`
      );
    }
  }

  function handleFirstPostInView(
    inView: boolean,
    entry: IntersectionObserverEntry
  ) {
    if (inView) {
      const pageInView = Number(entry.target.getAttribute("data-page"));
      console.log(`first post in view for page ${pageInView}`);
      const pageData = loadedPages[pageInView];
      console.log(
        `pageData for first post in view: ${JSON.stringify(pageData, null, 2)}`
      );
      if (
        pageData &&
        pageData.previousPage &&
        !posts?.[pageData.previousPage]
      ) {
        const previousPage = pageData.previousPage;
        if (commentFetcher.state === "idle") {
          commentFetcher.load(
            `/api/getTopicComments?topicId=${topicId}&page=${previousPage}`
          );
        }
      }
    }
  }

  function handleLastPostInView(
    inView: boolean,
    entry: IntersectionObserverEntry
  ) {
    if (inView) {
      const pageInView = Number(entry.target.getAttribute("data-page"));
      console.log(`last post in view for page: ${pageInView}`);
      const pageData = loadedPages[pageInView];
      console.log(
        `pageData for last post in view: ${JSON.stringify(pageData, null, 2)}`
      );
      if (
        pageData &&
        pageData.nextPage !== null &&
        !posts?.[pageData.nextPage]
      ) {
        const nextPage = pageData.nextPage;
        if (commentFetcher.state === "idle") {
          commentFetcher.load(
            `/api/getTopicComments?topicId=${topicId}&page=${nextPage}`
          );
        }
      }
    }
  }

  /*
  useEffect(() => {
    function loadTopicCommentsForPage(page: number) {
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

      if (
        isLastPost &&
        pageData &&
        pageData.nextPage !== null &&
        !posts?.[pageData.nextPage]
      ) {
        loadTopicCommentsForPage(pageData.nextPage);
      } else if (
        !isLastPost &&
        pageData &&
        pageData.previousPage !== null &&
        !posts?.[pageData.previousPage]
      ) {
        loadTopicCommentsForPage(pageData.previousPage);
      }
    };

    const debouncedHandleIntersection = debounce(handleIntersection, 100);

    if (firstPostInView && firstPostEntry) {
      //  handleIntersection(firstPostEntry, false);
    } else if (lastPostInView && lastPostEntry) {
      // handleIntersection(lastPostEntry, true);
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
     */

  useEffect(() => {
    if (commentFetcher.data?.comments.pagedPosts) {
      const { currentPage, previousPage, nextPage } =
        commentFetcher.data.comments;
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

  useEffect(() => {
    if (scrollToPost && commentFetcher.state === "idle") {
      navigate({ hash: `#${scrollToPost}` }, { replace: true });
      setScrollToPost(null);
    }
  }, [navigate, scrollToPost, setScrollToPost, commentFetcher.state]);

  const toggleEditorOpen = () => {
    setEditorOpen(!editorOpen);
  };

  const renderComments = useMemo(() => {
    function handleJumpToPost(postNumber: number, postId: number) {
      const requiredPage = Math.floor(postNumber / 20);
      commentFetcher.load(
        `/api/getTopicComments?topicId=${topicId}&page=${requiredPage}`
      );
      setScrollToPost(`post-${postId}`);
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
                        className={`${
                          lastOfPage
                            ? "lastOfPage"
                            : firstOfPage
                            ? "firstOfPage"
                            : ""
                        }`}
                        key={post.id}
                        id={`post-${post.id}`}
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
  }, [posts, commentFetcher, topicId, nextRef, prevRef, setScrollToPost]);

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
          <ZalgEditorClientOnly
            toggleOpenState={toggleEditorOpen}
            replyToPostNumber={replyToPostNumber}
          />
        </div>
      </div>
    </div>
  );
}
