import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";

import { discourseSessionStorage } from "~/services/session.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const discourseUserSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const externalId = discourseUserSession.get("external_id");
  const avatarUrl = discourseUserSession.get("avatar_url");
  const discourseAdmin = discourseUserSession.get("admin");

  return json(
    { user: { externalId, avatarUrl, discourseAdmin } },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(
          discourseUserSession
        ),
      },
    }
  );
};

export default function HelloDiscourse() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="pt-8">
      <div className="max-w-screen-lg mx-auto">
        <header>
          <h1>Hello Discourse</h1>
        </header>
        <article>
          <p>
            This is an example post. It’s being used in the first step of
            developing a WP Recourse plugin (Headless WordPress {">"} Remix
            {">"} Discourse comments.)
          </p>
          <p>
            The associated Discourse topic is at{" "}
            <Link
              className="text-cyan-200 hover:text-cyan-300"
              to="http://localhost:4200/t/hello-discourse/487"
            >
              http://localhost:4200/t/hello-discourse/497
            </Link>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
