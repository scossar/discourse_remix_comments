import { useState } from "react";

import Comments from "~/components/Comments";
import PageContextProvider from "~/components/PageContextProvider";
import type { ParsedDiscourseTopicMap } from "~/types/parsedDiscourse";

type CommentsMapProps = {
  commentsMapData: ParsedDiscourseTopicMap;
  children: React.ReactElement<typeof Comments>;
};

export default function CommentsMap({
  commentsMapData,
  children,
}: CommentsMapProps) {
  const [page, setPage] = useState<number | null>(null);

  return (
    <div className="comments-map">
      <div>Comment map for topic {commentsMapData.title}</div>
      <PageContextProvider value={{ page, setPage }}>
        {children}
      </PageContextProvider>
    </div>
  );
}
