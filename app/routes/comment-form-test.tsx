import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { marked } from "marked";
import MarkdownCommentForm from "~/components/MarkdownCommentForm";

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
  const discourseUsername = String(formData.get("username")) ?? "";
  const topicId = Number(formData.get("topicId")) ?? null;
  const replyToPostNumber = Number(formData.get("replyToPostNumber")) ?? null;
  const cooked = marked.parse(rawComment);

  console.log(
    `Parsed action formData. cooked: ${cooked}, discourseUsername: ${discourseUsername}, topicId: ${topicId}, replyToPostNumber: ${replyToPostNumber}`
  );

  return json({});
}

export default function CommentFormTest() {
  const { user } = useLoaderData<typeof loader>();
  const currentUsername = user?.username ?? "";
  const topicId = 123; // would be passed from the loader
  const replyToPostNumber = null;
  const hiddenFields = {
    username: currentUsername,
    topicId: topicId,
    replyToPostNumber: replyToPostNumber,
  };
  return (
    <div className="max-w-screen-lg mx-auto">
      <h1>Comment Form Test</h1>
      <div>
        <MarkdownCommentForm
          className="my-2"
          formClassName="my-2 flex flex-col"
          hiddenFields={hiddenFields}
        />
      </div>
    </div>
  );
}
