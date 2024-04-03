import { Form, useFetcher } from "@remix-run/react";
import { useState } from "react";

import debounce from "~/services/debounce";

interface CommentFormProps {
  className?: string;
}

interface FormFetcher {
  html?: string | null;
}

export default function CommentForm({ className }: CommentFormProps) {
  const previewFetcher = useFetcher<FormFetcher>({ key: "html-preview" });
  const [textareaValue, setTextareaValue] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  let htmlPreview = "";
  if (previewFetcher && previewFetcher?.data) {
    htmlPreview = previewFetcher.data?.html ?? "";
  }

  const debouncedPreview = debounce((rawComment: string) => {
    previewFetcher.submit(
      { rawComment },
      {
        method: "post",
        action: "/api/markdownParser",
        navigate: false, // not sure about this
        preventScrollReset: true,
      }
    );
  }, 500);

  function handleTextareaChange(event: React.FormEvent<HTMLTextAreaElement>) {
    const value = event.currentTarget.value;
    setTextareaValue(value);
    debouncedPreview(value);
  }

  function handlePreviewClick(event: React.FormEvent<HTMLButtonElement>) {
    event.preventDefault();
    previewFetcher.submit(
      { rawComment: textareaValue },
      {
        method: "post",
        action: "/api/markdownParser",
        navigate: false, // not sure about this
        preventScrollReset: true,
      }
    );
    setPreviewOpen(!previewOpen);
  }

  return (
    <div {...(className ? { className } : {})}>
      <div
        className={`w-1/2 comment-preview mb-8 p-2 h-96 bg-slate-50 text-slate-950 overflow-y-scroll my-2 border-l-4 border-slate-400 ${
          previewOpen ? "block" : "hidden"
        }`}
      >
        <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
      </div>
      <Form
        className={`my-2 flex flex-col  ${previewOpen ? "w-1/2" : "w-full"}`}
        method="post"
      >
        <textarea
          className="h-96 p-2 text-slate-950"
          name="rawComment"
          onChange={handleTextareaChange}
        ></textarea>
        <div className="flex">
          <button
            className="text-cyan-900 font-bold bg-slate-50 w-fit px-2 py-1 mt-3 rounded-sm"
            type="submit"
          >
            Reply
          </button>
          <button
            className="text-cyan-900 font-bold bg-slate-50 w-fit px-2 py-1 mt-3 ml-2 rounded-sm"
            onClick={handlePreviewClick}
          >
            Preview
          </button>
        </div>
      </Form>
    </div>
  );
}
