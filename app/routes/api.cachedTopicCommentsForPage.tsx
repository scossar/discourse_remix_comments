import type { LoaderFunctionArgs } from "@remix-run/node";
import { getRedisClient } from "~/services/redisClient.server";
import type {
  ParsedDiscoursePost,
  ParsedDiscourseTopicComments,
} from "~/types/parsedDiscourse";
import { getPostStreamKey, getCommentKey } from "~/services/redisKeys.server";
import { addTopicStreamRequest } from "~/services/jobs/rateLimitedApiWorker.server";
import type { Redis } from "ioredis";

export async function loader({ request }: LoaderFunctionArgs) {
  const { searchParams } = new URL(request.url);
  const topicId = Number(searchParams?.get("topicId"));
  const page = Number(searchParams?.get("page"));
  const chunkSize = 20;

  try {
    const client = await getRedisClient();
    const start = page * chunkSize;
    const end = start + chunkSize - 1;
    const nextPostIds = await client.lrange(
      getPostStreamKey(topicId),
      start,
      end
    );

    if (nextPostIds.length === 0) {
      await addTopicStreamRequest({ topicId });
    }

    const promises = nextPostIds.map((postId) =>
      getCachedComment(topicId, Number(postId), client)
    );
    const comments = await Promise.all(promises);
    const filteredComments = comments.filter(
      (comment): comment is ParsedDiscoursePost => comment !== null
    );

    const postStreamKey = getPostStreamKey(topicId);
    const streamLength = await client.llen(postStreamKey);
    const totalPages = Math.ceil(streamLength / chunkSize);
    const nextPage = page + 1 < totalPages ? page + 1 : null;
    const previousPage = page - 1 >= 0 ? page - 1 : null;

    const parsedTopicComments: ParsedDiscourseTopicComments = {
      topicId: topicId,
      currentPage: page,
      nextPage: nextPage,
      previousPage: previousPage,
      pagedPosts: {
        [page]: filteredComments,
      },
    };

    return parsedTopicComments;
  } catch (error) {
    return new Response(
      `Error returning topicComments for topicId: ${topicId}, page: ${page}`
    );
  }
}

async function getCachedComment(
  topicId: number,
  postId: number,
  client: Redis
): Promise<ParsedDiscoursePost | null> {
  const comment = await client.get(getCommentKey(topicId, postId));
  if (comment) {
    return JSON.parse(comment);
  }

  return null;
}
