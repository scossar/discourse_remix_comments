import type { LoaderFunctionArgs } from "@remix-run/node";
import { discourseEnv } from "~/services/config.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const env = discourseEnv();
  console.log(`apiKey: ${env.apiKey}`);
  return null;
}
