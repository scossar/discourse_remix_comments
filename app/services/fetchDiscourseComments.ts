import FetchCommentsError from "./errors/fetchCommentsError";
import { json } from "@remix-run/node";

// Data received from Discourse:
interface Post {
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

interface Participant {
  id: number;
  username: string;
  post_count: number;
  avatar_template: string;
}

interface Details {
  can_create_post: boolean;
  participants: Participant[];
}

interface Topic {
  post_stream: {
    posts: Post[];
    stream: number[];
  };
  id: number;
  fancy_title?: string;
  posts_count: number;
  like_count: number;
  archetype: "regular" | "personal_message";
  slug: string;
  category_id?: number;
  user_id: number;
  details: Details;
}

// Data for the client:
interface TopicPostStreamPost {
  id: number;
  username: string;
  avatarUrl: string;
  createdAt: string;
  cooked: string;
  postNumber: number;
  updatedAt: string;
  userId: number;
}

interface TopicPostStreamParticipant {
  id: number;
  username: string;
  postCount: number;
  avatarUrl: string;
}

interface TopicPostStreamDetails {
  canCreatePost: boolean;
  participants: TopicPostStreamParticipant[];
}

interface PostStreamForTopic {
  id: number;
  slug: string;
  postStream: {
    posts: TopicPostStreamPost[];
    stream: number[];
  };
  details: TopicPostStreamDetails;
}

function isRegularReplyPost(post: Post) {
  return post.post_type === 1 && post.post_number > 1;
}

function generateAvatarUrl(
  avatarTemplate: string,
  discourseBaseUrl: string,
  size = "48"
) {
  const sized = avatarTemplate.replace("{size}", size);
  return `${discourseBaseUrl}${sized}`;
}

export async function fetchDiscourseCommentsFor(
  currentUsername: string,
  topicId: number,
  slug: string
) {
  if (!process.env.DISCOURSE_BASE_URL || !process.env.DISCOURSE_API_KEY) {
    throw new FetchCommentsError("Env variables not configured", 403);
  }
  const apiKey = process.env.DISCOURSE_API_KEY;
  const baseUrl = process.env.DISCOURSE_BASE_URL;
  const headers = new Headers();
  headers.append("Api-Key", apiKey);
  headers.append("Api-Username", currentUsername);
  const topicUrl = `${baseUrl}/t/${slug}/${topicId}.json`;

  const response = await fetch(topicUrl, { headers });
  if (!response.ok) {
    throw new FetchCommentsError(
      "A bad response returned from Discourse",
      response.status
    );
  }

  const data: Topic = await response.json();
  const postStreamForTopic: PostStreamForTopic = {
    id: data.id,
    slug: data.slug,
    postStream: {
      stream: data.post_stream.stream,
      posts: data.post_stream.posts
        .filter(isRegularReplyPost)
        .map((post: Post) => ({
          id: post.id,
          username: post.username,
          avatarUrl: generateAvatarUrl(post.avatar_template, baseUrl),
          createdAt: post.created_at,
          cooked: post.cooked,
          postNumber: post.post_number,
          updatedAt: post.updated_at,
          userId: post.user_id,
        })),
    },
    details: {
      canCreatePost: data.details.can_create_post,
      participants: data.details.participants.map(
        (participant: Participant) => ({
          id: participant.id,
          username: participant.username,
          postCount: participant.post_count,
          avatarUrl: generateAvatarUrl(participant.avatar_template, baseUrl),
        })
      ),
    },
  };
  return json({ postStreamForTopic });
}
