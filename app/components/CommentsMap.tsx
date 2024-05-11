import { useEffect } from "react";
import { usePageContext } from "~/hooks/usePageContext";
import Comments from "~/components/Comments";
//import PageContextProvider from "~/components/PageContextProvider";
import type { ParsedDiscourseTopicMap } from "~/types/parsedDiscourse";

type CommentsMapProps = {
  commentsMapData: ParsedDiscourseTopicMap;
  children: React.ReactElement<typeof Comments>;
};

export default function CommentsMap({
  commentsMapData,
  children,
}: CommentsMapProps) {
  const { page } = usePageContext();
  useEffect(() => {
    console.log(`page from CommentsMap component: ${page}`);
  }, [page]);

  return (
    <div className="comments-map">
      <div>Comment map for topic {commentsMapData.title}</div>
      {children}
    </div>
  );
}
