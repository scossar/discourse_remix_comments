import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { discourseEnv } from "~/services/config.server";
import { discourseSessionStorage } from "~/services/session.server";
import { getSessionData, validateSession } from "~/schemas/currentUser.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );

  const sessionData = getSessionData(session);
  let currentUser;
  try {
    currentUser = validateSession(sessionData);
  } catch (error) {
    throw new Response("Something has gone wrong", { status: 403 });
  }

  console.log(`currentUser: ${JSON.stringify(currentUser, null, 2)}`);

  return json(
    {},
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(session),
      },
    }
  );
}
