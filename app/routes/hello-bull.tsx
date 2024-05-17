import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { addTopicCommentsRequest } from "~/services/jobs/rateLimitedApiWorker.server";
import { getRedisClient } from "~/services/redisClient.server";
import { getTopicCommentsKey } from "~/services/redisKeys.server";
import type {
  ParsedDiscourseTopicComments,
  ParsedDiscoursePost,
} from "~/types/parsedDiscourse";

export async function loader() {
  const page = 0;
  const topicId = 505;
  let comments;
  try {
    const client = await getRedisClient();
    const cacheKey = getTopicCommentsKey(topicId, page);
    comments = await client.get(cacheKey);
  } catch (error) {
    throw new Error("this will eventually be handled");
  }

  if (!comments) {
    await addTopicCommentsRequest({
      topicId: topicId,
      page: page,
    });
    return json({ comments: null, topicId, page });
  }

  return json({ comments: JSON.parse(comments), topicId, page });
}

export default function HelloBull() {
  const { comments, topicId, page } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ParsedDiscourseTopicComments>();
  const [liveComments, setLiveComments] = useState<
    ParsedDiscoursePost[] | null
  >(comments?.pagedPosts?.[page]);

  useEffect(() => {
    if (!liveComments) {
      const interval = setInterval(async () => {
        fetcher.load(
          `/api/cachedTopicCommentsForPage?topicId=${topicId}&page=${page}`
        );
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [liveComments, fetcher, page, topicId]);

  useEffect(() => {
    if (fetcher && fetcher.data) {
      setLiveComments(fetcher.data?.pagedPosts?.[page]);
    }
  }, [fetcher, page]);

  return (
    <div className="mx-auto max-w-prose">
      {liveComments &&
        liveComments.map((comment) => (
          <div key={comment.id}>{comment.username}</div>
        ))}
    </div>
  );
}
