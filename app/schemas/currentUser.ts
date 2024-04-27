import { z } from "zod";

const CurrentUserSchema = z.object({
  externalId: z.number().nullable(),
  avatarUrl: z.string().nullable().optional(),
  admin: z.boolean().nullable(),
  username: z.string().nullable(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;
