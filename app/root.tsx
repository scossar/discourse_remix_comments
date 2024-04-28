import type { LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
  useRouteError,
} from "@remix-run/react";

import Header from "~/components/Header";
import type { HeaderProps } from "~/components/Header";

import styles from "./tailwind.css?url";
export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

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
  const matchesData = useMatches()
    .slice(-1)
    .map((match) => match.data)?.[0] as HeaderProps;
  const currentUser = matchesData?.currentUser;

  return (
    <div className="min-h-screen text-white bg-cyan-950">
      <Header currentUser={currentUser} />
      <Outlet />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error?.data) {
    const errorMessage = error?.data;

    return (
      <div>
        <h1>Error</h1>
        <p>users {errorMessage}</p>
      </div>
    );
  } else {
    return (
      <div>
        <h1>Error</h1>
        <p>Something has gone wrong.</p>
      </div>
    );
  }
}
