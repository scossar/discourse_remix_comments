import { createCookieSessionStorage } from "@remix-run/node";
import { discourseEnv } from "~/services/config.server";

const { nonceSecret, sessionSecret } = discourseEnv();

export const nonceStorage = createCookieSessionStorage({
  cookie: {
    name: "_nonce",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [nonceSecret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes for now, could probably be reduced
  },
});

export const discourseSessionStorage = createCookieSessionStorage({
  cookie: {
    name: "_session",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    secrets: [sessionSecret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 48, // set to two days for now
  },
});
