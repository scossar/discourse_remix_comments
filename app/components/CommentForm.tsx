import { Form } from "@remix-run/react";
import { memo, useRef, useState } from "react";
import { useDebouncedPreview } from "~/hooks/useDebouncedPreview";
import { useMarkdownSyntax } from "~/hooks/useMarkdownSyntax";
import MarkdownButton from "./MarkdownButton";

interface CommentFormProps {
  className?: string;
  topicId?: number;
  replyToPostNumber?: number;
  handleCreatePostClick: () => void;
}

function CommentForm({
  className,
  topicId,
  replyToPostNumber,
  handleCreatePostClick,
}: CommentFormProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { text, setText, applyMarkdownSyntax } = useMarkdownSyntax(
    "",
    textareaRef
  );

  const preview = useDebouncedPreview(text, previewOpen);

  function handleTextareaChange(event: React.FormEvent<HTMLTextAreaElement>) {
    const value = event.currentTarget.value;
    setText(value);
  }

  return (
    <div {...(className ? { className } : {})}>
      <Form className={`my-2 flex flex-col w-full`} method="post">
        <div className="formatting/editor/preview-container">
          <div className="formatting/editor-container flex flex-row w-full h-full min-h-96">
            <div
              className={`flex flex-col ${previewOpen ? "w-1/2" : "w-full"}`}
            >
              <div className={`formatting-buttons flex bg-slate-100 h-10`}>
                <MarkdownButton
                  style="bold"
                  label="B"
                  applyMarkdownSyntax={applyMarkdownSyntax}
                />
                <MarkdownButton
                  style="italic"
                  label="I"
                  applyMarkdownSyntax={applyMarkdownSyntax}
                />
                <MarkdownButton
                  style="h1"
                  label="H1"
                  applyMarkdownSyntax={applyMarkdownSyntax}
                />
                <MarkdownButton
                  style="h2"
                  label="H2"
                  applyMarkdownSyntax={applyMarkdownSyntax}
                />
                <MarkdownButton
                  style="ul"
                  label="UL"
                  applyMarkdownSyntax={applyMarkdownSyntax}
                />
                <MarkdownButton
                  style="ol"
                  label="OL"
                  applyMarkdownSyntax={applyMarkdownSyntax}
                />
                <MarkdownButton
                  style="blockquote"
                  label="Q"
                  applyMarkdownSyntax={applyMarkdownSyntax}
                />
              </div>
              <textarea
                className="p-2 text-slate-950 h-full"
                name="raw"
                onChange={handleTextareaChange}
                ref={textareaRef}
                value={text}
              ></textarea>
            </div>
            <input
              type="hidden"
              name="replyToPostNumber"
              value={replyToPostNumber}
            />
            <div
              className={`w-1/2 comment-preview p-2 h-full bg-slate-50 text-slate-950 overflow-y-scroll border-l-4 border-slate-400 ${
                previewOpen ? "block" : "hidden"
              }`}
            >
              <div>
                {previewOpen ? (
                  preview ? (
                    <div dangerouslySetInnerHTML={{ __html: preview }} />
                  ) : (
                    <div>loading preview...</div>
                  )
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="submit/preview-button-container">
          <button
            className="text-cyan-900 font-bold bg-slate-50 w-fit px-2 py-1 mt-3 rounded-sm"
            type="submit"
            onClick={() => handleCreatePostClick()}
          >
            Reply
          </button>
          <button
            className="text-cyan-900 font-bold bg-slate-50 w-fit px-2 py-1 mt-3 ml-2 rounded-sm"
            onClick={(event) => {
              event.preventDefault();
              setPreviewOpen(!previewOpen);
            }}
          >
            {previewOpen ? "Hide Preview" : "Show Preview"}
          </button>
        </div>
      </Form>
    </div>
  );
}

export default memo(CommentForm);
