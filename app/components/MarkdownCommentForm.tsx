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

  function handleBoldButton(event: React.FormEvent<HTMLButtonElement>) {
    // clicking the button should either insert `**|**` into the adjacent `textarea` (with `|` representing the position of the cursor)
    // or it should capture any text that's been highlighted in the `textarea` and surround that text with `**{highlighted_text}**`
    // some issues to be dealt with:
    //  - how to maintain the cursor position in the `textarea` when the button (that's outside of the `textarea`) is clicked
    //  - how to capture the `textarea` highlighted text in the `handleBoldButton` event handler
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
        <div className="formatting-buttons flex w-full bg-slate-100">
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={handleBoldButton}
          >
            Bold
          </button>
        </div>
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
