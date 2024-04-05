import type { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "~/services/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  if (!process.env.DISCOURSE_API_KEY || !process.env.DISCOURSE_BASE_URL) {
    throw new Response("Config variables not set");
  }

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId");

  const apiKey = process.env.DISCOURSE_API_KEY;
  const baseUrl = process.env.DISCOURSE_BASE_URL;

  const headers = new Headers();

  return null;
}
