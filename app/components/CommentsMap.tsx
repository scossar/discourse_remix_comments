import { useMemo } from "react";
import { useFetcher } from "@remix-run/react";
import { usePageContext } from "~/hooks/usePageContext";
import Comments from "~/components/Comments";
import type { ParsedDiscourseTopicMap } from "~/types/parsedDiscourse";

const chunkSize = 20;

type CommentsMapProps = {
  commentsMapData: ParsedDiscourseTopicMap;
  children: React.ReactElement<typeof Comments>;
};

export default function CommentsMap({
  commentsMapData,
  children,
}: CommentsMapProps) {
  const { page } = usePageContext();
  const commentsCount = commentsMapData.postsCount - 1;
  const commentText = commentsCount === 1 ? "comment" : "comments";
  const totalPages = Math.ceil(commentsMapData.postsCount / chunkSize);
  // TODO: this needs to be passed from the loader

  return (
    <div className="comments-map">
      <div className="flex">
        {commentsCount > 0 ? (
          <div className="flex">
            <div>
              {commentsCount} {commentText}
            </div>
          </div>
        ) : (
          <div>Leave a comment</div>
        )}
      </div>
      {children}
    </div>
  );
}
