export interface ParsedDiscoursePost {
  id: number;
  username: string;
  avatarUrl: string;
  createdAt: string;
  cooked: string;
  postNumber: number;
  replyCount: number;
  replyToPostNumber: number | null;
  topicId: number;
  updatedAt: string;
  userId: number;
}

export interface ParsedDiscourseReplyPost extends ParsedDiscoursePost {
  replyToUser: ParsedDiscourseReplyToUser;
}

export interface ParsedDiscourseBasicUser {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface ParsedDiscourseParticipant extends ParsedDiscourseBasicUser {
  postCount: number;
}

export interface ParsedDiscourseReplyToUser {
  username: string;
  avatarUrl: string;
}

// note: the Discourse `can_create_post` field is not set for anonymous topic requests
export interface ParsedDiscourseDetails {
  canCreatePost?: boolean;
  participants: ParsedDiscourseParticipant[];
}

export interface ParsedDiscourseTopic {
  id: number;
  slug?: string;
  postStream: {
    posts: ParsedDiscoursePost[];
    stream?: number[];
  };
  details?: ParsedDiscourseDetails;
}

export type ParsedPagedDiscourseTopic = {
  [currentPage: number]: ParsedDiscourseTopic;
};

export type ParsedPagedDiscoursePosts = {
  [pageNumber: number]: ParsedDiscoursePost[];
};

export interface ParsedDiscourseTopicComments {
  topicId: number;
  currentPage: number;
  nextPage: number | null;
  previousPage: number | null;
  slug?: string;
  pagedPosts: ParsedPagedDiscoursePosts;
  details?: ParsedDiscourseDetails;
}

export interface ParsedDiscourseCommentReplies {
  repliesForPostId: number;
  posts: ParsedDiscourseReplyPost[];
}

export interface ParsedDiscourseTopicMapDetails extends ParsedDiscourseDetails {
  createdBy: ParsedDiscourseBasicUser;
  lastPoster: ParsedDiscourseBasicUser;
}

export interface ParsedDiscourseTopicMap {
  id: number;
  title: string;
  slug: string;
  postsCount: number;
  createdAt: string;
  lastPostedAt: string;
  likeCount: number;
  participantCount: number;
  details: ParsedDiscourseTopicMapDetails;
}
