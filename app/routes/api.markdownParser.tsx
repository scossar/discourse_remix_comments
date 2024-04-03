import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { marked } from "marked";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const raw = String(formData.get("rawComment")) ?? "";
  const window = new JSDOM("").window;
  const purify = DOMPurify(window);
  const cleaned = purify.sanitize(raw, { ALLOWED_TAGS: [] });
  const html = await marked.parse(cleaned);

  return json({ html });
}
