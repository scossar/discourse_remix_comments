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
  return (
    <div className="comments-map">
      <div>Comment map for topic {commentsMapData.title}</div>
      {children}
    </div>
  );
}
