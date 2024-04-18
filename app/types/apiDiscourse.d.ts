export interface DiscourseWebhookHeaders {
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

export enum PostType {
  Regular = 1,
  ModeratorAction = 2,
  SmallAction = 3,
  Whisper = 4,
}

export interface BasicUser {
  id: number;
  username: string;
  avatar_template: string;
}

export interface DiscourseConnectUser {
  externalId?: number | null;
  avatarUrl?: string | null;
  admin?: boolean | null;
  username?: string | null;
}

export interface Participant extends BasicUser {
  post_count: number;
}

export interface Details {
  can_create_post: boolean;
  participants: Participant[];
}

export interface Category {
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

export interface Tag {
  id: string;
  text: string;
  description?: string;
  count?: number; // probably don't use this field, all other fields are available in webhook topic payload
}

export interface Post {
  id: number;
  username: string;
  avatar_template: string;
  created_at: string;
  cooked: string;
  post_number: number;
  post_type: PostType;
  updated_at: string;
  reply_count: number;
  reply_to_post_number?: number;
  topic_id: number;
  topic_title: string;
  category_id: number;
  raw: string;
  user_id: number;
  topic_archetype: "regular" | "private_message";
  category_slug?: string;
}

export interface BasicTopic {
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
  created_by: BasicUser;
  last_poster: BasicUser;
}

export interface PostStream {
  post_stream: {
    posts: Post[];
    stream: number[];
  };
}

export interface TopicWithPostStream extends BasicTopic {
  post_stream: {
    posts: Post[];
    stream: number[];
  };
  details: Details;
}

export interface WebHookTopic {
  topic: BasicTopic;
}

export interface WebHookPost {
  post: Post;
}