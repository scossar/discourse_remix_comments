import { useFetcher } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import type {
  ParsedDiscoursePost,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import Comment from "~/components/Comment";

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

  useEffect(() => {
    if (
      commentFetcher.data?.comments.posts &&
      commentFetcher.data.comments.nextPage !== page
    ) {
      const newPosts = commentFetcher.data.comments.posts;
      const allPosts = posts ? [...posts, ...newPosts] : newPosts;
      setPosts(allPosts);
      console.log(JSON.stringify(allPosts, null, 2));
      setPage(commentFetcher.data.comments.nextPage);
    }
  }, [commentFetcher.data, page, posts]);

  const handleReplyClick = (postNumber: string) => {
    setReplyToPostNumber(postNumber);
    setEditorOpen(true);
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
      <div className="divide-y divide-cyan-800">{renderComments}</div>
    </div>
  );
}
