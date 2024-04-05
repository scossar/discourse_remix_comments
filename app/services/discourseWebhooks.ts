import type { DiscourseWebhookHeaders } from "~/types/discourse";
import { createHmac, timingSafeEqual } from "node:crypto";

// helper function for accessing webhook headers
export const discourseWehbookHeaders = (
  headers: Headers
): DiscourseWebhookHeaders => {
  return {
    Accept: headers.get("Accept"),
    Connection: headers.get("Connection"),
    "Content-Length": headers.get("Content-Length"),
    "Content-Type": headers.get("Content-Type"),
    Host: headers.get("Host"),
    "User-Agent": headers.get("User-Agent"),
    "X-Discourse-Instance": headers.get("X-Discourse-Instance"),
    "X-Discourse-Event-Id": headers.get("X-Discourse-Event-Id"),
    "X-Discourse-Event-Type": headers.get("X-Discourse-Event-Type"),
    "X-Discourse-Event": headers.get("X-Discourse-Event"),
    "X-Discourse-Event-Signature": headers.get("X-Discourse-Event-Signature"),
  };
};

export const verifyWebhookRequest = (
  payload: string,
  xDiscourseEventSignature: string
) => {
  if (!process.env.DISCOURSE_WEBHOOK_SECRET) {
    console.warn("Webhook Error: webhook secret not set");
    return false;
  }
  const secret = process.env.DISCOURSE_WEBHOOK_SECRET;
  const computedSig = createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const receivedSig = xDiscourseEventSignature.substring(7);

  const receivedSigBuffer = Buffer.from(receivedSig, "hex");
  const computedSigBuffer = Buffer.from(computedSig, "hex");

  if (receivedSigBuffer.length !== computedSigBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedSigBuffer, computedSigBuffer);
};
