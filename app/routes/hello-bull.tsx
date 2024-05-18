import { useEffect, useRef, useState } from "react";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import {
  // addTopicCommentsRequest,
  addCommentsMapRequest,
} from "~/services/jobs/rateLimitedApiWorker.server";
import { getRedisClient } from "~/services/redisClient.server";
import { getOrQueueCommentsMapCache } from "~/services/getOrQueueCommentsMapCache.server";
import {
  getTopicCommentsKey,
  getCommentsMapKey,
} from "~/services/redisKeys.server";
import type {
  ParsedDiscourseTopicComments,
  ParsedDiscourseCommentsMap,
  ParsedDiscoursePost,
} from "~/types/parsedDiscourse";
import RedisError from "~/services/errors/redisError.server";

export async function loader() {
  const page = 0;
  const topicId = 505;

  let client;
  try {
    client = await getRedisClient();
  } catch (error) {
    throw new RedisError("Unable to obtain Redis Client");
  }

  let commentsMap;
  try {
    commentsMap = await getOrQueueCommentsMapCache(topicId);
  } catch (error) {
    // in the production app, this won't actually throw an error
    // instead, it will return a response that can be handled by the UI
    throw new RedisError("Error getting or queuing commentsMap");
  }

  let comments;
  try {
    comments = await client.get(getTopicCommentsKey(topicId, page));
  } catch (error) {
    throw new RedisError("Error fetching cached comments");
  }

  return json({
    comments: comments ? JSON.parse(comments) : null,
    commentsMap: commentsMap ? commentsMap : null,
    topicId,
    page,
  });
}

export default function HelloBull() {
  const { comments, commentsMap, topicId, page } =
    useLoaderData<typeof loader>();
  const commentsFetcher = useFetcher<ParsedDiscourseTopicComments>({
    key: "comments-fetcher",
  });
  const commentsMapFetcher = useFetcher<ParsedDiscourseCommentsMap>({
    key: "comments-map-fetcher",
  });
  const [liveCommentsMap, setLiveCommentsMap] =
    useState<ParsedDiscourseCommentsMap | null>(commentsMap);
  const [liveComments, setLiveComments] = useState<
    ParsedDiscoursePost[] | null
  >(comments?.pagedPosts?.[page]);
  const retriesRef = useRef(0);
  const [retryMessage, setRetryMessage] = useState("");

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (!liveCommentsMap && retriesRef.current < 5) {
      intervalId = setInterval(async () => {
        retriesRef.current += 1;
        commentsMapFetcher.load(`/api/cachedCommentsMap?topicId=${topicId}`);
        if (retriesRef.current >= 5) {
          clearInterval(intervalId);
          setRetryMessage(
            "Comments are not available at this time. Please try again later."
          );
        }
      }, 1000);
      return () => clearInterval(intervalId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [liveCommentsMap, commentsMapFetcher, topicId]);

  useEffect(() => {
    if (commentsMapFetcher && commentsMapFetcher.data) {
      setLiveCommentsMap(commentsMapFetcher.data);
    }
  }, [commentsMapFetcher]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (!liveComments && retriesRef.current < 5) {
      intervalId = setInterval(async () => {
        retriesRef.current += 1;
        commentsFetcher.load(
          `/api/cachedTopicCommentsForPage?topicId=${topicId}&page=${page}`
        );
        if (retriesRef.current >= 5) {
          clearInterval(intervalId);
          setRetryMessage(
            "Comments are not available at this time. Please try again later."
          );
        }
      }, 1000);
      return () => clearInterval(intervalId);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [liveComments, commentsFetcher, page, topicId]);

  useEffect(() => {
    if (commentsFetcher && commentsFetcher.data) {
      setLiveComments(commentsFetcher.data?.pagedPosts?.[page]);
    }
  }, [commentsFetcher, page]);

  return (
    <div className="mx-auto max-w-prose">
      {retryMessage && <div>{retryMessage}</div>}
      {liveCommentsMap && liveCommentsMap.title}
      {liveComments &&
        liveComments.map((comment) => (
          <div key={comment.id}>{comment.username}</div>
        ))}
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div>
      <p>
        Will the interval be cleared if the error boundary catches an error?
      </p>
    </div>
  );
}
