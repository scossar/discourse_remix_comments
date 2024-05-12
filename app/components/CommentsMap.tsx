import Comments from "~/components/Comments";
import type { ParsedDiscourseTopicMap } from "~/types/parsedDiscourse";

type CommentsMapProps = {
  commentsMapData: ParsedDiscourseTopicMap;
  children: React.ReactElement<typeof Comments>;
};

export default function CommentsMap({
  commentsMapData,
  children,
}: CommentsMapProps) {
  const commentsCount = commentsMapData.postsCount - 1;
  const commentText = commentsCount === 1 ? "comment" : "comments";

  return (
    <div className="comments-map">
      <div className="flex">
        {commentsCount > 0 && (
          <div className="flex">
            <div>
              {commentsCount} {commentText}
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
