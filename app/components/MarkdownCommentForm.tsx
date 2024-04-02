import { Form, useFetcher } from "@remix-run/react";
import { useState, useRef } from "react";

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
  const [textareaValue, setTextareaValue] = useState("");

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
    setTextareaValue(raw);
    debouncedPreview(raw);
  }

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  function handleBoldButton(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
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

      const newText = `${beforeText}**${
        selectedText || "bold text"
      }**${afterText}`;
      setTextareaValue(newText);
      // setTimeout is used to defer the execution of the code until the callstack is clear.
      // directly manipulating the DOM during rendering can lead to inconsistencies between the VDOM and the actual DOM.
      setTimeout(() => {
        // restore the cursor's position
        textareaRef.current?.focus();
        // if no text was selected, place the cursor inside the bold syntax
        if (!selectedText) {
          textareaRef.current?.setSelectionRange(
            selectionStart + 2,
            selectionStart + 11
          );
        } else {
          textareaRef.current?.setSelectionRange(
            selectionStart,
            selectionEnd + 4
          );
        }
      }, 0);
      // render new preview HTML
      debouncedPreview(newText);
    }
  }

  function handleMarkdownSyntax(
    event: React.MouseEvent<HTMLButtonElement>,
    style: string
  ) {
    event.preventDefault();
    let syntax: string,
      syntaxType = "prepend",
      placeholder = "";
    switch (style) {
      case "bold":
        syntax = "**";
        syntaxType = "wrap";
        placeholder = "bold text";
        break;
      case "italic":
        syntax = "*";
        syntaxType = "wrap";
        placeholder = "italic text";
        break;
      case "h1":
        syntax = "# ";
        syntaxType = "prepend";
        placeholder = "h1 heading";
        break;
      case "h2":
        syntax = "## ";
        syntaxType = "prepend";
        placeholder = "h2 heading";
        break;
      case "ul":
        syntax = "- ";
        syntaxType = "prepend";
        placeholder = "list item";
        break;
      case "ol":
        syntax = "1. ";
        syntaxType = "prepend";
        placeholder = "ordered list item";
        break;
      case "quote":
        syntax = ">";
        syntaxType = "prepend";
        placeholder = "quote";
        break;
      default:
        syntax = "";
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

      let newText = "";
      let styledText = "";

      if (selectedText.length > 0) {
        if (syntaxType === "wrap") {
          const selections = selectedText.split(/\n\n+/);
          styledText = selections
            .map((selection) =>
              selection ? `${syntax}${selection.trim()}${syntax}` : selection
            )
            .join("\n\n");
        } else if (syntaxType === "prepend") {
          const lines = selectedText.split(/\n/);
          styledText = lines
            .map((line) => (line ? `${syntax}${line.trim()}` : line))
            .join("\n");
        }
      } else {
        if (syntaxType === "wrap") {
          styledText = selectedText
            ? `${syntax}${selectedText.trim()}${syntax}`
            : `${syntax}${placeholder}${syntax}`;
        } else if (syntaxType === "prepend") {
          styledText = selectedText
            ? `${syntax}${selectedText.trim()}`
            : `${syntax}${placeholder}`;
        }
      }

      newText = `${beforeText}${styledText}${afterText}`;

      setTextareaValue(newText);
      setTimeout(() => {
        if (selectedText.length > 0) {
          const newCursorPosition = selectionStart + styledText.length;
          textareaRef.current?.setSelectionRange(
            newCursorPosition,
            newCursorPosition
          );
          textareaRef.current?.focus();
        } else {
          const syntaxOffset = syntaxType === "wrap" ? syntax.length : 0;
          textareaRef.current?.setSelectionRange(
            selectionStart + syntax.length,
            selectionStart + styledText.length - syntaxOffset
          );
          textareaRef.current?.focus();
        }
      }, 0);
      debouncedPreview(newText);
    }
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
            onClick={(e) => handleMarkdownSyntax(e, "bold")}
          >
            Bold
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "italic")}
          >
            Italic
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
            Unordered List
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "ol")}
          >
            Ordered List
          </button>
          <button
            className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
            onClick={(e) => handleMarkdownSyntax(e, "quote")}
          >
            Quote
          </button>
        </div>
        <textarea
          className="h-96 p-2 text-slate-950"
          name="rawComment"
          onChange={handleCommentChange}
          ref={textareaRef}
          value={textareaValue}
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
