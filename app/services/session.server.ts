import { createCookieSessionStorage } from "@remix-run/node";

if (!process.env.NONCE_SECRET || !process.env.DISCOURSE_SESSION_SECRET) {
  throw new Error("Required cookie secret not set");
}
const nonceSecret: string = process.env.NONCE_SECRET;
const discourseSessionSecret: string = process.env.DISCOURSE_SESSION_SECRET;

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
    secrets: [discourseSessionSecret],
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 48, // set to two days for now
  },
});
