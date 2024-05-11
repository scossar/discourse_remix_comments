import Comments from "~/components/Comments";
type CommentsMapProps = {
  topicId: number;
};

export default function CommentsMap({
  topicId,
  children,
}: PropsWithChildren<CommentsMapProps>) {
  return (
    <div className="comments-map">
      <div>Comment map for topic ID: {topicId}</div>
      {children}
    </div>
  );
}
