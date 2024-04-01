import { Form, useFetcher } from "@remix-run/react";
import { useState } from "react";

import debounce from "~/services/debounce";

interface CommentFormProps {
  className?: string;
  formClassName?: string;
  submitText?: string;
  topicId?: number;
  replyToPostNumber?: number | null;
  hiddenFields?: Record<string, string | number | null>;
}

interface FormFetcher {
  htmlPreview?: string | null;
}

export default function MarkdownCommentForm({ ...props }: CommentFormProps) {
  const commentPreviewFetcher = useFetcher<FormFetcher>({
    key: "comment-form-preview",
  });
  const className = props?.className ?? "";
  const formClassName = props?.formClassName ?? "";
  const submitText = props?.submitText ?? "Reply";
  const hiddenFields = props?.hiddenFields ?? null;

  const [previewOpen, setPreviewOpen] = useState(false);
  let cookedPreview = "";

  if (commentPreviewFetcher && commentPreviewFetcher?.data) {
    cookedPreview = commentPreviewFetcher.data?.htmlPreview ?? "";
  }

  function handlePreviewClick(event: React.FormEvent<HTMLButtonElement>) {
    setPreviewOpen(!previewOpen);
  }

  const debouncedPreview = debounce((raw: string) => {
    commentPreviewFetcher.submit(
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
    debouncedPreview(raw);
  }

  return (
    <div className={className}>
      <div
        className={`comment-preview mb-8 p-2 h-96 bg-slate-50 text-slate-950 overflow-y-scroll ${
          previewOpen ? "block" : "hidden"
        }`}
      >
        <div dangerouslySetInnerHTML={{ __html: cookedPreview }} />
      </div>
      <Form className={formClassName} method="post" action="?">
        <>
          {hiddenFields &&
            Object.entries(hiddenFields).map(([key, value]) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={value === null ? "" : value}
              />
            ))}
        </>
        <textarea
          className="h-96 p-2 text-slate-950"
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
      </Form>
    </div>
  );
}
