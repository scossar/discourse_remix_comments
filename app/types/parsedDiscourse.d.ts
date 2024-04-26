export interface ParsedDiscoursePost {
  id: number;
  username: string;
  avatarUrl: string;
  createdAt: string;
  cooked: string;
  postNumber: number;
  replyCount: number;
  replyToPostNumber: number | null;
  updatedAt: string;
  userId: number;
}

export interface ParsedDiscourseReplyPost extends ParsedDiscoursePost {
  replyToUser: ParsedDiscourseBasicUser;
}

export interface ParsedDiscourseBasicUser {
  id: number;
  username: string;
  avatarUrl: string;
}

export interface ParsedDiscourseParticipant extends ParsedDiscourseBasicUser {
  postCount: number;
}

export interface ParsedDiscourseDetails {
  canCreatePost: boolean;
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

export interface ParsedDiscourseTopicComments {
  topicId: number;
  nextPage: number | null;
  slug?: string;
  posts: ParsedDiscoursePost[];
  details?: ParsedDiscourseDetails;
}

export interface ParsedDiscourseCommentReplies {
  posts: ParsedDiscoursePost[];
}
