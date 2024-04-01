import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { marked } from "marked";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const raw = String(formData.get("raw")) ?? "";

  //const url = new URL(request.url);
  //const raw = String(url.searchParams.get("raw")) ?? "";
  console.log(`raw in action: ${raw}`);
  const htmlPreview = marked.parse(raw);

  console.log(`htmlPreview in action: ${htmlPreview}`);
  return json({ htmlPreview: htmlPreview });
}
