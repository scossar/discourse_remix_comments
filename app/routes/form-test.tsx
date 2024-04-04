import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import { marked } from "marked";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

import CommentForm from "~/components/CommentForm";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const rawComment = String(formData.get("rawComment")) ?? "";

  const window = new JSDOM("").window;
  const purify = DOMPurify(window);
  const cleanedComment = purify.sanitize(rawComment, { ALLOWED_TAGS: [] });
  const htmlComment = await marked.parse(cleanedComment);
  console.log(`html: ${htmlComment}`);

  // return something from the action
  return json({});
}

export default function FormTest() {
  return (
    <div className="max-w-screen-md mx-auto">
      <h1 className="text-3xl">Comment Form Test</h1>
      <CommentForm className="my-2 p-3 flex" />
    </div>
  );
}
