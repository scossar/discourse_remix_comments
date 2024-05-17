/**
 * Generates a Redis key for post streams.
 * @param {number} topicId - The unique identifier for the topic.
 * @returns {string} The Redis key for the post stream.
 */
export function getPostStreamKey(topicId: number): string {
  return `postStream:${topicId}`;
}

/**
 * Generates a Redis key for topic comments.
 * @param {number} topicId - The unique identifier for the topic.
 * @param {number} page - The page number of comments.
 * @returns {string} The Redis key for the topic comments.
 */
export function getTopicCommentsKey(topicId: number, page: number): string {
  return `comments:${topicId}:${page}`;
}

/**
 * Generates a Redis key for commentsMap data.
 * @param {number} topicId - The unique identifier for the topic.
 * @returns {string} The Redis key for commentsMap data.
 */
export function getCommentsMapKey(topicId: number): string {
  return `commentsMap:${topicId}`;
}
