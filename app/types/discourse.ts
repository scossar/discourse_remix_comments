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

export interface DiscourseWebhookTopicAuthor {
  id: number;
  username: string;
  avatar_template: string;
}

export interface DiscourseWebhookNewTopicData {
  topic: {
    title: string;
    fancy_title: string;
    id: number;
    archetype: "regular" | "personal_message";
    slug: string;
    category_id: number;
    word_count: number;
    created_by: DiscourseWebhookTopicAuthor;
  };
}

export interface Post {
  id: number;
  username: string;
  avatar_template: string;
  created_at: string;
  cooked: string;
  post_number: number;
  post_type: 1 | 2 | 3 | 4; // :regular=>1, :moderator_action=>2, :small_action=>3, :whisper=>4
  updated_at: string;
  user_id: number;
}

export interface Participant {
  id: number;
  username: string;
  post_count: number;
  avatar_template: string;
}

export interface Details {
  can_create_post: boolean;
  participants: Participant[];
}

export interface Topic {
  post_stream: {
    posts: Post[];
    stream: number[];
  };
  id: number;
  fancy_title: string;
  posts_count: number;
  like_count: number;
  archetype: "regular" | "personal_message";
  slug: string;
  category_id: number;
  user_id: number;
  details: Details;
  created_at: string;
}
