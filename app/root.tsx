import type { LinksFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useMatches,
  useRouteError,
} from "@remix-run/react";

import Header from "~/components/Header";
import type { HeaderProps } from "~/components/Header";

import styles from "./tailwind.css?url";
export const links: LinksFunction = () => [{ rel: "stylesheet", href: styles }];

export async function loader() {
  if (!process.env.DISCOURSE_BASE_URL) {
    throw new Response("DISCOURSE_BASE_URL is not defined", { status: 500 });
  }
  const discourseBaseUrl = process.env.DISCOURSE_BASE_URL;

  return json({ discourseBaseUrl });
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
  const { discourseBaseUrl } = useLoaderData<typeof loader>();
  const discourseData = {
    baseUrl: discourseBaseUrl,
  };
  const matchesData = useMatches()
    .slice(-1)
    .map((match) => match.data)?.[0] as HeaderProps;
  const currentUser = matchesData?.user;

  return (
    <div className="bg-cyan-950 min-h-screen text-white">
      <Header user={currentUser} />
      <Outlet context={discourseData} />
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
        <p>
          todo: this works, but don't display env variable names to the app's
          users {errorMessage}
        </p>
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
