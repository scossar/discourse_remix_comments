import type { LoaderFunctionArgs } from "@remix-run/node";
import { discourseEnv } from "~/services/config.server";
import { discourseSessionStorage } from "~/services/session.server";
import { CurrentUserSchema, CurrentUser } from "~/schemas/currentUser";

export async function loader({ request }: LoaderFunctionArgs) {
  const env = discourseEnv();
  console.log(`apiKey: ${env.apiKey}`);
  const session = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );

  const { externalId, avatarUrl, admin, username } = session.get();

  console.log(`externalId: ${externalId}`);
  return null;
}
