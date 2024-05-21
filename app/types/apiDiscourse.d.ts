export interface ApiDiscourseWebHookHeaders {
  Accept?: string | null;
  Connection?: string | null;
  "Content-Length"?: string | null;
  "Content-Type"?: string | null;
  Host?: string | null;
  "User-Agent"?: string | null;
  "X-Discourse-Instance"?: string | null;
  "X-Discourse-Event-Id"?: string | null;
  "X-Discourse-Event-Type"?: string | null;
  "X-Discourse-Event"?: string | null;
  "X-Discourse-Event-Signature"?: string | null;
}

export enum ApiDiscoursePostType {
  Regular = 1,
  ModeratorAction = 2,
  SmallAction = 3,
  Whisper = 4,
}

export interface ApiDiscourseBasicUser {
  id: number;
  username: string;
  avatar_template: string;
}

export interface ApiDiscourseConnectUser {
  externalId?: number | null;
  avatarUrl?: string | null;
  admin?: boolean | null;
  username?: string | null;
}

export interface ApiDiscourseParticipant extends ApiDiscourseBasicUser {
  post_count: number;
}

export interface ApiDiscourseDetails {
  can_create_post: boolean;
  participants: ApiDiscourseParticipant[];
}

export interface ApiDiscourseCategory {
  id: number;
  parent_category_id?: number;
  name: string;
  color: string;
  slug: string;
  topic_count: number;
  description_text: string;
  has_children: boolean;
  uploaded_logo?: string;
  uploaded_logo_dark?: string;
}

export interface ApiDiscourseTag {
  id: string;
  text: string;
  description?: string;
  count?: number; // probably don't use this field, all other fields are available in webhook topic payload
}

export interface ApiDiscoursePost {
  id: number;
  username: string;
  avatar_template: string;
  created_at: string;
  cooked: string;
  post_number: number;
  post_type: ApiDiscoursePostType;
  updated_at: string;
  reply_count: number;
  reply_to_post_number: number | null;
  topic_id: number;
  topic_title: string;
  category_id: number;
  raw: string;
  user_id: number;
  topic_archetype: "regular" | "private_message";
  category_slug?: string;
}

export interface ApiDiscourseReplyPost extends ApiDiscoursePost {
  reply_to_user: ApiDiscourseBasicUser;
}

export interface ApiDiscourseBasicTopic {
  tags: string[];
  tags_descriptions: Record<string, string>;
  id: number;
  title: string;
  fancy_title: string;
  posts_count: number;
  created_at: string;
  like_count: number;
  last_posted_at: string;
  visible: boolean;
  closed: boolean;
  archetype: "regular" | "private_message";
  slug: string;
  category_id: number;
  word_count: number;
  user_id: number;
  created_by: ApiDiscourseBasicUser;
  last_poster: ApiDiscourseBasicUser;
}

export interface ApiDiscoursePostStream {
  post_stream: {
    posts: ApiDiscoursePost[];
    stream: number[];
  };
}

export interface ApiDiscourseTopicWithPostStream
  extends ApiDiscourseBasicTopic {
  post_stream: {
    posts: ApiDiscoursePost[];
    stream: number[];
  };
  details: ApiDiscourseDetails;
}

export interface ApiDiscourseWebHookTopic {
  topic: ApiDiscourseBasicTopic;
}

export interface ApiDiscourseWebHookPost {
  post: ApiDiscoursePost;
}
