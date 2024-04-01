import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
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
  const currentUser = matchesData?.user;

  return (
    <div className="bg-cyan-950 min-h-screen text-white">
      <Header user={currentUser} />
      <Outlet />
    </div>
  );
}
