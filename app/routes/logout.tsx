import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { discourseSessionStorage } from "~/services/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const session = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );

  return redirect("/", {
    headers: {
      "Set-Cookie": await discourseSessionStorage.destroySession(session),
    },
  });
};
