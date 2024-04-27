import { useFetcher } from "@remix-run/react";
import { useState } from "react";
import type { ParsedDiscourseTopicComments } from "~/types/parsedDiscourse";

type CommentFetcherData = { comment: ParsedDiscourseTopicComments };

type CommentsProps = {
  topicId: number;
};

export default function Comments({ topicId }: CommentsProps) {
  const commentFetcher = useFetcher<CommentFetcherData>();
  const [page, setPage] = useState(0);

  function getInitialComments() {
    commentFetcher.load(
      `/api/getTopicComments?topicId=${topicId}&page=${page}`
    );
  }

  return (
    <div>
      <button onClick={getInitialComments}>Comments</button>
    </div>
  );
}
