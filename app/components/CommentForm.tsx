import { Form, useFetcher } from "@remix-run/react";
import { useRef, useState } from "react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  type MarkdownStyle =
    | "bold"
    | "italic"
    | "h1"
    | "h2"
    | "ul"
    | "ol"
    | "blockquote";

  type MarkdownConfigType = {
    [key: string]: {
      syntax: string;
      syntaxType: "prepend" | "wrap";
      placeholder: string;
      delimiter: "\n\n" | "\n";
    };
  };

  const markdownConfig: MarkdownConfigType = {
    bold: {
      syntax: "**",
      syntaxType: "wrap",
      placeholder: "bold text",
      delimiter: "\n\n",
    },
    italic: {
      syntax: "*",
      syntaxType: "wrap",
      placeholder: "italic text",
      delimiter: "\n\n",
    },
    h1: {
      syntax: "# ",
      syntaxType: "prepend",
      placeholder: "h1 heading",
      delimiter: "\n",
    },
    h2: {
      syntax: "## ",
      syntaxType: "prepend",
      placeholder: "h2 heading",
      delimiter: "\n",
    },
    ul: {
      syntax: "- ",
      syntaxType: "prepend",
      placeholder: "list item",
      delimiter: "\n",
    },
    ol: {
      syntax: "1. ",
      syntaxType: "prepend",
      placeholder: "ordered list item",
      delimiter: "\n",
    },
    blockquote: {
      syntax: ">",
      syntaxType: "prepend",
      placeholder: "block quote",
      delimiter: "\n\n",
    },
  };

  function handleMarkdownSyntax(
    event: React.MouseEvent<HTMLButtonElement>,
    style: MarkdownStyle
  ) {
    event.preventDefault();
    const config = markdownConfig[style];

    if (!config) {
      console.warn(`Unhandled style: ${style}. No syntax applied`);
      return;
    }

    const selectionStart = textareaRef.current?.selectionStart;
    const selectionEnd = textareaRef.current?.selectionEnd;

    if (
      typeof selectionStart === "number" &&
      typeof selectionEnd === "number"
    ) {
      const beforeText = textareaValue.substring(0, selectionStart);
      const selectedText = textareaValue.substring(
        selectionStart,
        selectionEnd
      );
      const afterText = textareaValue.substring(selectionEnd);

      let styledText = "";
      if (selectedText.length === 0) {
        styledText = `${config.syntax}${config.placeholder}${
          config.syntaxType === "wrap" ? config.syntax : ""
        }`;
      } else {
        const selections = selectedText.split(config.delimiter);
        styledText = selections
          .map((selection) =>
            selection
              ? `${config.syntax}${selection.trim()}${
                  config.syntaxType === "wrap" ? config.syntax : ""
                }`
              : selection
          )
          .join(config.delimiter);
      }

      const updatedTextContent = `${beforeText}${styledText}${afterText}`;
      // this will trigger the component to re-render
      setTextareaValue(updatedTextContent);
      // update the ref inside a setTimeout function to ensure the callstack is clear
      setTimeout(() => {
        if (selectedText.length === 0) {
          const syntaxOffset =
            config.syntaxType === "wrap" ? config.syntax.length : 0;
          textareaRef.current?.setSelectionRange(
            selectionStart + config.syntax.length,
            selectionStart + styledText.length - syntaxOffset
          );
          textareaRef.current?.focus();
        } else {
          const newCursorPosition = selectionStart + styledText.length;
          textareaRef.current?.setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
          textareaRef.current?.focus();
        }
      }, 0);
      debouncedPreview(updatedTextContent);
    }
  }

  return (
    <div {...(className ? { className } : {})}>
      <div
        className={`w-1/2 comment-preview mb-8 p-2 h-96 mt-12 bg-slate-50 text-slate-950 overflow-y-scroll my-2 border-l-4 border-slate-400 ${
          previewOpen ? "block" : "hidden"
        }`}
      >
        <div dangerouslySetInnerHTML={{ __html: htmlPreview }} />
      </div>
      <Form
        className={`my-2 flex flex-col  ${previewOpen ? "w-1/2" : "w-full"}`}
        method="post"
      >
        <div className="formatting-buttons flex w-full bg-slate-100 h-10">
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "bold")}
          >
            <strong>B</strong>
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "italic")}
          >
            <em>I</em>
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "h1")}
          >
            H1
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "h2")}
          >
            H2
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "ul")}
          >
            UL
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "ol")}
          >
            OL
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "blockquote")}
          >
            Q
          </button>
        </div>
        <textarea
          className="h-96 p-2 text-slate-950"
          name="rawComment"
          onChange={handleTextareaChange}
          ref={textareaRef}
          value={textareaValue}
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
