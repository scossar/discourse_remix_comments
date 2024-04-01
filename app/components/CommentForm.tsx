import { useFetcher } from "@remix-run/react";
import { useState } from "react";

import type { DiscourseUser } from "~/services/getCurrentDiscourseUser.session";
import debounce from "~/services/debounce";

interface CommentFormProps {
  className?: string;
  formClassName?: string;
  submitText?: string;
  user: DiscourseUser | null;
  topicId: number;
  replyToPostNumber?: number | null;
}

interface FormFetcher {
  htmlPreview?: string | null;
}

export default function CommentForm({ ...props }: CommentFormProps) {
  const fetcher = useFetcher<FormFetcher>();
  const className = props?.className ?? "";
  const formClassName = props?.formClassName ?? "";
  const submitText = props?.submitText ?? "Reply";
  const username = props.user?.username ?? "";
  const topicId = props.topicId;
  const replyToPostNumber = props?.replyToPostNumber;

  const [previewOpen, setPreviewOpen] = useState(true);
  let cookedPreview = "";

  if (fetcher && fetcher?.data) {
    cookedPreview = fetcher.data?.htmlPreview ?? "";
  }

  function handlePreviewClick(event: React.FormEvent<HTMLButtonElement>) {
    // setPreviewOpen(!previewOpen);
  }

  const debouncedPreview = debounce((raw: string) => {
    fetcher.submit(
      { raw: raw },
      {
        method: "post",
        action: "/api/markdownParser",
        navigate: false, // not sure about this
        preventScrollReset: true,
      }
    );
  }, 500);

  function handleCommentChange(event: React.FormEvent<HTMLTextAreaElement>) {
    const raw = event.currentTarget.value;
    // console.log(`raw from handleCommentChange: ${raw}`);
    debouncedPreview(raw);
  }

  return (
    <div className={className}>
      <fetcher.Form className={formClassName} method="post" action="?">
        <input type="hidden" name="username" value={username} />
        <input type="hidden" name="topicId" value={topicId} />
        {replyToPostNumber && (
          <input
            type="hidden"
            name="replyToPostNumber"
            value={replyToPostNumber}
          />
        )}
        <textarea
          className="h-64 p-2 text-slate-950"
          name="rawComment"
          onChange={handleCommentChange}
        ></textarea>
        <div>
          <button
            className="text-cyan-900 font-bold bg-slate-50 w-fit px-2 py-1 mt-3 rounded-sm"
            type="submit"
          >
            {submitText}
          </button>
          <button
            onClick={handlePreviewClick}
            className="text-cyan-900 font-bold bg-slate-50 w-fit  px-2 py-1 ml-3 mt-3 rounded-sm"
          >
            Preview
          </button>
        </div>
      </fetcher.Form>
      <div
        className={`comment-preview my-2 p-2 h-64 bg-slate-50 text-slate-950 overflow-y-scroll ${
          previewOpen ? "block" : "hidden"
        }`}
      >
        <div dangerouslySetInnerHTML={{ __html: cookedPreview }} />
      </div>
    </div>
  );
}
