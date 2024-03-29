import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

export interface User {
  user?: {
    externalId?: number | null;
    avatarUrl?: string | null;
  };
}

import { discourseSessionStorage } from "~/services/session.server";

import Header from "~/components/Header";

import styles from "./tailwind.css?url";
export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
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
};

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
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="bg-cyan-900 h-screen text-slate-50">
      <Header user={user} />
      <Outlet />
    </div>
  );
}
