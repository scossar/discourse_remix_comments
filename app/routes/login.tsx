import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { isRouteErrorResponse, useRouteError } from "@remix-run/react";

import { createHmac, randomBytes } from "node:crypto";

import {
  nonceStorage,
  discourseSessionStorage,
} from "~/services/session.server";

type DiscourseUserParamKeys =
  | "name"
  | "username"
  | "email"
  | "external_id"
  | "admin"
  | "moderator"
  | "groups"
  | "avatar_url"
  | "profile_background_url"
  | "card_background_url";
type SessionParamSet = Set<DiscourseUserParamKeys>;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (!process.env.DISCOURSE_SSO_SECRET || !process.env.DISCOURSE_BASE_URL) {
    return redirect("/"); // todo: this should be configurable
  }

  const secret = process.env.DISCOURSE_SSO_SECRET;
  const url = new URL(request.url);
  const sso = url.searchParams.get("sso");
  const sig = url.searchParams.get("sig");

  const nonceSession = await nonceStorage.getSession(
    request.headers.get("Cookie")
  );

  if (!sso && !sig) {
    const nonce = randomBytes(16).toString("hex");
    const ssoPayload = `nonce=${nonce}&return_sso_url=http://localhost:5173/login`;
    const base64EncodedPayload = Buffer.from(ssoPayload).toString("base64");
    const urlEncodedPayload = encodeURIComponent(base64EncodedPayload);
    const signature = createHmac("sha256", secret)
      .update(base64EncodedPayload)
      .digest("hex");
    const discourseBaseUrl = process.env.DISCOURSE_BASE_URL;
    const discourseConnectUrl = `${discourseBaseUrl}/session/sso_provider?sso=${urlEncodedPayload}&sig=${signature}`;
    nonceSession.set("nonce", nonce);

    return redirect(discourseConnectUrl, {
      headers: {
        "Set-Cookie": await nonceStorage.commitSession(nonceSession),
      },
    });
  }

  if (sso && sig) {
    const computedSig = createHmac("sha256", secret).update(sso).digest();
    const receivedSigBytes = Buffer.from(sig, "hex");
    if (!computedSig.equals(receivedSigBytes)) {
      console.error(
        `Signature mismatch detected at ${new Date().toISOString()}`
      );
      throw new Response(
        "There was an error during the login process. Please try again. If the error persists, contact a site administrator",
        {
          status: 400,
          headers: {
            "Set-Cookie": await nonceStorage.destroySession(nonceSession),
          },
        }
      );
    }
    const decodedPayload = Buffer.from(sso, "base64").toString("utf-8");
    const params = new URLSearchParams(decodedPayload);
    const nonce = params.get("nonce");
    const sessionNonce = nonceSession.get("nonce");
    if (!(sessionNonce && sessionNonce === nonce)) {
      console.error(`Nonce mismatch detected at ${new Date().toISOString()}`);
      throw new Response(
        "There was an error during the login process. Please try again. If the error persists, contact a site administrator",
        {
          status: 400,
          headers: {
            "Set-Cookie": await nonceStorage.destroySession(nonceSession),
          },
        }
      );
    }

    const userSession = await discourseSessionStorage.getSession();

    const sessionParams: SessionParamSet = new Set([
      "external_id",
      "username",
      "avatar_url",
      "groups",
      "admin",
    ]);

    for (const [key, value] of params) {
      if (sessionParams.has(key as DiscourseUserParamKeys)) {
        userSession.set(key, value);
      }
    }
    const headers = new Headers();
    headers.append(
      "Set-Cookie",
      await nonceStorage.destroySession(nonceSession)
    );
    headers.append(
      "Set-Cookie",
      await discourseSessionStorage.commitSession(userSession)
    );
    return redirect("/", { headers });
  }

  throw new Response("Login Error", {
    status: 400,
    headers: { "Set-Cookie": await nonceStorage.destroySession(nonceSession) },
  });
};

// this should never get rendered
export default function Login() {
  return (
    <div>
      <h1>Something has gone wrong</h1>
      <p>
        There was an error during the login process. Please try again. If the
        error persists, contact a site administrator.
      </p>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error?.data) {
    const errorMessage = error?.data;

    return (
      <div>
        <h1>Login Error</h1>
        <p>{errorMessage}</p>
      </div>
    );
  } else {
    return (
      <div>
        <h1>Login Error</h1>
        <p>Something has gone wrong.</p>
      </div>
    );
  }
}
