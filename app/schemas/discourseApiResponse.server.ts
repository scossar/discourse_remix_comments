import { z } from "zod";

/**
 * General
 */
export enum DiscourseApiPostType {
  Regular = 1,
  ModeratorAction = 2,
  SmallAction = 3,
  Whisper = 4,
}
const PostTypeSchema = z.nativeEnum(DiscourseApiPostType);

export const DiscourseApiTopicArchetypeSchema = z.union([
  z.literal("regular"),
  z.literal("private_message"),
]);

/**
 * User
 */
export const DiscourseApiBasicUserSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatar_template: z.string(),
});
export type DiscourseApiBasicUser = z.infer<typeof DiscourseApiBasicUserSchema>;

export const DiscourseApiParticipantSchema = DiscourseApiBasicUserSchema.extend(
  {
    post_count: z.number(),
  }
);
export type DiscourseApiParticipant = z.infer<
  typeof DiscourseApiParticipantSchema
>;

export const DiscourseApiParticipantsSchema = z.array(
  DiscourseApiParticipantSchema
);
export type DiscourseApiParticipants = z.infer<
  typeof DiscourseApiParticipantsSchema
>;

export const DiscourseApiReplyToUserSchema = z.object({
  username: z.string(),
  avatar_template: z.string(),
});
export type DiscourseApiReplyToUser = z.infer<
  typeof DiscourseApiReplyToUserSchema
>;

/**
 * Post
 */
export const DiscourseApiBasicPostSchema = z.object({
  id: z.number(),
  username: z.string(),
  avatar_template: z.string(),
  created_at: z.string(),
  cooked: z.string(),
  post_number: z.number(),
  post_type: PostTypeSchema,
  updated_at: z.string(),
  reply_count: z.number(),
  reply_to_post_number: z.number().nullable(),
  topic_id: z.number(),
  topic_slug: z.string(),
  user_id: z.number(),
  hidden: z.boolean(),
  deleted_at: z.string().nullable(),
});
export type DiscourseApiBasicPost = z.infer<typeof DiscourseApiBasicPostSchema>;

export const DiscourseApiBasicPostsSchema = z.array(
  DiscourseApiBasicPostSchema
);
export type DiscourseApiBasicPosts = z.infer<
  typeof DiscourseApiBasicPostsSchema
>;

export const ValidDiscourseApiCommentPostSchema =
  DiscourseApiBasicPostSchema.refine(
    (post) => post.post_type === 1 && post.post_number > 1
  );
export type ValidDiscourseApiCommentPost = z.infer<
  typeof ValidDiscourseApiCommentPostSchema
>;

export const ValidDiscourseApiCommentPostsSchema = z.array(
  ValidDiscourseApiCommentPostSchema
);
export type ValidDiscourseApiCommentPosts = z.infer<
  typeof ValidDiscourseApiCommentPostsSchema
>;

export function validateDiscourseApiCommentPosts(
  commentPosts: DiscourseApiBasicPosts
): ValidDiscourseApiCommentPosts {
  return commentPosts.reduce(
    (validPosts: ValidDiscourseApiCommentPosts, post) => {
      const result = ValidDiscourseApiCommentPostSchema.safeParse(post);
      if (result.success) {
        validPosts.push(result.data);
      }
      return validPosts;
    },
    []
  );
}

export const DiscourseApiReplyPostSchema = DiscourseApiBasicPostSchema.extend({
  reply_to_user: DiscourseApiReplyToUserSchema,
});
export type DiscourseApiReplyPost = z.infer<typeof DiscourseApiReplyPostSchema>;

export const DiscourseApiReplyPostsSchema = z.array(
  DiscourseApiReplyPostSchema
);
export type DiscourseApiReplyPosts = z.infer<
  typeof DiscourseApiReplyPostsSchema
>;

export const ValidDiscourseApiReplyPostSchema =
  DiscourseApiReplyPostSchema.refine(
    (post) => post.post_type === 1 && post.post_number > 1
  );
export type ValidDiscourseApiReplyPost = z.infer<
  typeof ValidDiscourseApiReplyPostSchema
>;

export const ValidDiscourseApiReplyPostsSchema = z.array(
  ValidDiscourseApiReplyPostSchema
);
export type ValidDiscourseApiReplyPosts = z.infer<
  typeof ValidDiscourseApiReplyPostsSchema
>;

export function validateDiscourseApiReplyPosts(
  replyPosts: DiscourseApiReplyPosts
): ValidDiscourseApiReplyPosts {
  return replyPosts.reduce((validPosts: ValidDiscourseApiReplyPosts, post) => {
    const result = ValidDiscourseApiReplyPostSchema.safeParse(post);
    if (result.success) {
      validPosts.push(result.data);
    }
    return validPosts;
  }, []);
}

export function validateDiscourseApiBasicPost(post: DiscourseApiBasicPost) {
  return DiscourseApiBasicPostSchema.parse(post);
}

/**
 * Category
 */

export const DiscourseApiBasicCategorySchema = z.object({
  id: z.number(),
  parent_category_id: z.number().optional(),
  name: z.string(),
  color: z.string(),
  slug: z.string(),
  topic_count: z.number(),
  description_text: z.string().optional().nullable(),
  has_children: z.boolean(),
  uploaded_logo: z.string().optional().nullable(),
  uploaded_logo_dark: z.string().optional().nullable(),
});
export type DiscourseApiBasicCategory = z.infer<
  typeof DiscourseApiBasicCategorySchema
>;

export function validateDiscourseApiBasicCategory(
  category: DiscourseApiBasicCategory
) {
  return DiscourseApiBasicCategorySchema.parse(category);
}

/**
 * Topic
 */

export const DiscourseApiBasicTopicSchema = z.object({
  tags: z.array(z.string()),
  tags_descriptions: z.record(z.string(), z.string()),
  id: z.number(),
  title: z.string(),
  fancy_title: z.string(),
  posts_count: z.number(),
  created_at: z.string(),
  like_count: z.number(),
  last_posted_at: z.string(),
  visible: z.boolean(),
  closed: z.boolean(),
  archived: z.boolean(),
  archetype: DiscourseApiTopicArchetypeSchema,
  slug: z.string(),
  category_id: z.number().optional(),
  word_count: z.number(),
  deleted_at: z.string().nullable(),
  user_id: z.number(),
  participant_count: z.number(),
});
export type DiscourseApiBasicTopic = z.infer<
  typeof DiscourseApiBasicTopicSchema
>;

export const DiscourseApiTopicDetailsSchema = z.object({
  can_create_post: z.boolean().optional(),
  participants: DiscourseApiParticipantsSchema,
  created_by: DiscourseApiBasicUserSchema,
  last_poster: DiscourseApiBasicUserSchema,
});

export const DiscourseApiFullTopicSchema = DiscourseApiBasicTopicSchema.extend({
  details: DiscourseApiTopicDetailsSchema,
});
export type DiscourseApiFullTopic = z.infer<typeof DiscourseApiFullTopicSchema>;

export const DiscourseApiTopicPostStreamSchema = z.object({
  posts: DiscourseApiBasicPostsSchema,
  stream: z.array(z.number()),
});
export type DiscourseApiTopicPostStream = z.infer<
  typeof DiscourseApiTopicPostStreamSchema
>;

export const DiscourseApiPostStreamPostsSchema = z.object({
  posts: DiscourseApiBasicPostsSchema,
});
export const DiscourseApiTopicPostsOnlySchema = z.object({
  post_stream: DiscourseApiPostStreamPostsSchema,
});
export type DiscourseApiTopicPostsOnly = z.infer<
  typeof DiscourseApiTopicPostsOnlySchema
>;

export const DiscourseApiFullTopicWithPostStreamSchema =
  DiscourseApiFullTopicSchema.extend({
    post_stream: DiscourseApiTopicPostStreamSchema,
  });
export type DiscourseApiFullTopicWithPostStream = z.infer<
  typeof DiscourseApiFullTopicWithPostStreamSchema
>;

export function validateDiscourseApiPostStream(stream: number[]) {
  return z.array(z.number()).parse(stream);
}

export function validateDiscourseApiFullTopicWithPostStream(
  topic: DiscourseApiFullTopicWithPostStream
) {
  return DiscourseApiFullTopicWithPostStreamSchema.parse(topic);
}

/**
 * TopicMap
 * */

export const DiscourseApiBasicTopicMapSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  posts_count: z.number(),
  created_at: z.string(),
  last_posted_at: z.string(),
  like_count: z.number(),
  participant_count: z.number(),
  details: DiscourseApiTopicDetailsSchema,
});
export type DiscourseApiBasicTopicMap = z.infer<
  typeof DiscourseApiBasicTopicMapSchema
>;

export function validateDiscourseApiBasicTopicMap(
  topicMapData: DiscourseApiBasicTopicMap
): DiscourseApiBasicTopicMap {
  return DiscourseApiBasicTopicMapSchema.parse(topicMapData);
}

/**
 * Webhooks
 */
export const DiscourseApiWebHookPostSchema = z.object({
  post: DiscourseApiBasicPostSchema.extend({
    topic_title: z.string(),
    category_id: z.number().optional(),
    category_slug: z.string().optional(),
    topic_posts_count: z.number(),
    topic_filtered_posts_count: z.number(),
    topic_archetype: DiscourseApiTopicArchetypeSchema,
  }),
});
export type DiscourseApiWebHookPost = z.infer<
  typeof DiscourseApiWebHookPostSchema
>;

export const DiscourseApiWebHookTopicSchema =
  DiscourseApiBasicTopicSchema.extend({
    created_by: DiscourseApiBasicUserSchema,
    last_poster: DiscourseApiBasicUserSchema,
  });
export type DiscourseAPiWebHookTopic = z.infer<
  typeof DiscourseApiWebHookTopicSchema
>;

export const DiscourseApiWebHookTopicPayloadSchema = z.object({
  topic: DiscourseApiWebHookTopicSchema,
});
export type DiscourseApiWebHookTopicPayload = z.infer<
  typeof DiscourseApiWebHookTopicPayloadSchema
>;

export function validateDiscourseApiWebHookPost(
  webHookPost: DiscourseApiWebHookPost
) {
  return DiscourseApiWebHookPostSchema.parse(webHookPost);
}

export function validateDiscourseApiWebHookTopicPayload(
  webHookTopic: DiscourseApiWebHookTopicPayload
) {
  return DiscourseApiWebHookTopicPayloadSchema.parse(webHookTopic);
}
