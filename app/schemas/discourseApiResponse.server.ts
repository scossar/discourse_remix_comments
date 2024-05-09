import { z } from "zod";

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

export const DiscourseApiReplyToUserSchema = z.object({
  username: z.string(),
  avatar_template: z.string(),
});
export type DiscourseApiReplyToUser = z.infer<
  typeof DiscourseApiReplyToUserSchema
>;

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

export const DiscourseApiReplyPostSchema = DiscourseApiBasicPostSchema.extend({
  reply_to_user: DiscourseApiReplyToUserSchema,
});
export type DiscourseApiReplyPost = z.infer<typeof DiscourseApiReplyPostSchema>;

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

export function validateDiscourseApiWebHookPost(
  webHookPost: DiscourseApiWebHookPost
) {
  return DiscourseApiWebHookPostSchema.safeParse(webHookPost);
}
