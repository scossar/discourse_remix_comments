export function getPostStreamKey(topicId: number): string {
  return `postStream:${topicId}`;
}

export function getTopicCommentsKey(topicId: number, page: number): string {
  return `comments:${topicId}:${page}`;
}

export function getPostRepliesKey(postId: number): string {
  return `postReplies:${postId}`;
}

export function getCommentsMapKey(topicId: number): string {
  return `commentsMap:${topicId}`;
}

export function getTopicPermissionsKey(topicId: number, username: string) {
  return `topicPermissions:${topicId}:${username}`;
}
