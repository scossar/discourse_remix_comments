import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
} from "@remix-run/react";

import { discourseSessionStorage } from "~/services/session.server";

import Header from "~/components/Header";

import styles from "./tailwind.css?url";
export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

/*export const loader = async ({ request }: LoaderFunctionArgs) => {
  const userSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const externalId = userSession.get("external_id");
  const avatarUrl = userSession.get("avatar_url");

  return json(
    { user: { externalId: externalId, avatarUrl: avatarUrl } },
    {
      headers: {
        "Set-Cookie": await discourseSessionStorage.commitSession(userSession),
      },
    }
  );
};*/

interface CurrentUser {
  user?: {
    externalId?: number;
    avatarUrl?: string;
    discourseAdmin?: boolean;
  };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const matchUserData = useMatches()
    .slice(-1)
    .map((match) => match.data)?.[0] as CurrentUser;

  console.log(`matchUserData: ${JSON.stringify(matchUserData?.user)}`);

  return (
    <div className="bg-cyan-950 min-h-screen text-white">
      <Header />
      <Outlet />
    </div>
  );
}
