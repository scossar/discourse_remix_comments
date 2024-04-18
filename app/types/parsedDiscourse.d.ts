export interface ParsedDiscoursePost {
  id: number;
  username: string;
  avatarUrl: string;
  createdAt: string;
  cooked: string;
  postNumber: number;
  updatedAt: string;
  userId: number;
}

export interface ParsedDiscourseParticipant {
  id: number;
  username: string;
  postCount: number;
  avatarUrl: string;
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
  lastPostId?: number;
  page: number;
}

export type ParsedPagedDiscourseTopic = {
  [currentPage: number]: ParsedDiscourseTopic;
}

