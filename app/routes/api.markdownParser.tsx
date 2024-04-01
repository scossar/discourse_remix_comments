import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { marked } from "marked";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const raw = String(formData.get("raw")) ?? "";
  const htmlPreview = marked.parse(raw);

  return json({ htmlPreview: htmlPreview });
}
