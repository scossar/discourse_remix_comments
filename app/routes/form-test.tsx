import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";

import CommentForm from "~/components/CommentForm";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const rawComment = String(formData.get("rawComment")) ?? "";

  console.log(`rawComment: ${rawComment}`);

  return json({});
}

export default function FormTest() {
  return (
    <div>
      <h1>Comment Form Test</h1>
      <CommentForm />
    </div>
  );
}
