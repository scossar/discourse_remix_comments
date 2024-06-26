import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { discourseSessionStorage } from "~/services/session.server";
import { getSessionData, validateSession } from "~/schemas/currentUser.server";
import { fetchCommentsForUser } from "~/services/fetchCommentsForUser.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const sessionData = getSessionData(session);
  const currentUser = validateSession(sessionData);

  const { searchParams } = new URL(request.url);
  const topicId = Number(searchParams?.get("topicId"));
  const page = Number(searchParams?.get("page"));

  if (topicId === null || page === null) {
    throw new Response("Something has gone wrong", { status: 500 });
  }

  let comments, errorMessage;
  try {
    comments = await fetchCommentsForUser(topicId, currentUser.username, page);
  } catch {
    errorMessage = "Comments could not be loaded";
  }

  return json(
    { currentUser, comments, errorMessage },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(session),
      },
    }
  );
}
