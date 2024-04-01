import type { Session } from "@remix-run/node";

export interface DiscourseUser {
  externalId?: number | undefined;
  username?: string | undefined;
  admin?: boolean;
  avatarUrl?: string | undefined;
}

export default function getCurrentDiscourseUser(
  currentUserSession: Session
): DiscourseUser {
  const externalId =
    currentUserSession.get("external_id") &&
    typeof currentUserSession.get("external_id") === "number"
      ? currentUserSession.get("external_id")
      : null;
  const username =
    currentUserSession.get("username") &&
    typeof currentUserSession.get("username") === "string"
      ? currentUserSession.get("username")
      : null;
  const admin =
    currentUserSession.get("admin") &&
    typeof currentUserSession.get("admin") === "boolean"
      ? currentUserSession.get("admin")
      : false;
  const avatarUrl =
    currentUserSession.get("avatar_url") &&
    typeof currentUserSession.get("avatar_url") === "string"
      ? currentUserSession.get("avatar_url")
      : null;

  return {
    externalId: externalId,
    username: username,
    admin: admin,
    avatarUrl: avatarUrl,
  };
}
