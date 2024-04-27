import { z } from "zod";
import type { Session } from "@remix-run/node";

export const CurrentUserSchema = z.object({
  externalId: z.number().nullable(),
  avatarUrl: z.string().nullable().optional(),
  admin: z.boolean().nullable(),
  username: z.string().nullable(),
});

export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export const ANONYMOUS_USER = {
  externalId: null,
  avatarUrl: null,
  admin: null,
  username: null,
};

export function getSessionData(session: Session) {
  const externalId = session.get("external_id") ?? null;
  const username = session.get("username") ?? null;
  const admin = session.get("admin") ?? null;
  const avatarUrl = session.get("avatar_url") ?? null;

  return { externalId, username, admin, avatarUrl };
}

export function validateSession(data: CurrentUser): CurrentUser {
  try {
    return CurrentUserSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Session validation error:", error.flatten());
      return ANONYMOUS_USER;
    }
    throw error;
  }
}
