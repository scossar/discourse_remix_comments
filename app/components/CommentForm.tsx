import { Form } from "@remix-run/react";

export default function CommentForm() {
  return (
    <div>
      <Form method="post" action="?">
        <textarea
          className="h-96 p-2 text-slate-950"
          name="rawComment"
        ></textarea>
        <button
          className="text-cyan-900 font-bold bg-slate-50 w-fit px-2 py-1 mt-3 rounded-sm"
          type="submit"
        ></button>
      </Form>
    </div>
  );
}
