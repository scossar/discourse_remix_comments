import { z } from "zod";

const DiscourseEnvSchema = z.object({
  DISCOURSE_BASE_URL: z.string(),
  DISCOURSE_API_KEY: z.string(),
  DISCOURSE_SSO_SECRET: z.string(),
  DISCOURSE_SESSION_SECRET: z.string(),
  DISCOURSE_WEBHOOK_SECRET: z.string().min(12),
  NONCE_SECRET: z.string(),
});

export function discourseEnv() {
  let discourseEnv;
  try {
    const rawEnv = DiscourseEnvSchema.parse(process.env);
    discourseEnv = {
      baseUrl: rawEnv.DISCOURSE_BASE_URL,
      apiKey: rawEnv.DISCOURSE_API_KEY,
      ssoSecret: rawEnv.DISCOURSE_SSO_SECRET,
      sessionSecret: rawEnv.DISCOURSE_SESSION_SECRET,
      webhookSecret: rawEnv.DISCOURSE_WEBHOOK_SECRET,
      nonceSecret: rawEnv.NONCE_SECRET,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Failed to parse environment variables:", error.issues);
      throw new Error("Configuration error");
    }
    throw new Error("Configuration error");
  }
  return discourseEnv;
}
