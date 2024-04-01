import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router-dom";
import { json, redirect } from "@remix-run/node";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { marked } from "marked";
import CommentForm from "~/components/CommentForm";

import getCurrentDiscourseUser from "~/services/getCurrentDiscourseUser.session";
import { discourseSessionStorage } from "~/services/session.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const discourseUserSession = await discourseSessionStorage.getSession(
    request.headers.get("Cookie")
  );
  const user = getCurrentDiscourseUser(discourseUserSession);

  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const rawComment = String(formData.get("rawComment")) ?? "";
  const cooked = marked.parse(rawComment);

  console.log(`rawComment in action: ${rawComment}`);

  return json({ cookedPreview: cooked });
}

export default function CommentFormTest() {
  const { user } = useLoaderData<typeof loader>();
  return (
    <div className="max-w-screen-lg mx-auto">
      <h1>Comment Form Test</h1>
      <div>
        <CommentForm
          className="my-2 flex flex-row"
          formClassName="my-2 flex flex-col"
          user={user}
          topicId={1}
        />
      </div>
    </div>
  );
}
