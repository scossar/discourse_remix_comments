export function useMarkdownSyntax(
  textAreaValue = "",
  textAreaRef: React.RefObject<HTMLTextAreaElement>
) {}

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

  if (typeof selectionStart === "number" && typeof selectionEnd === "number") {
    const beforeText = textareaValue.substring(0, selectionStart);
    const selectedText = textareaValue.substring(selectionStart, selectionEnd);
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
  }
}
