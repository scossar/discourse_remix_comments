import { s } from "node_modules/vite/dist/node/types.d-aGj9QkWt";
import { useCallback, useState } from "react";

export type MarkdownStyle =
  | "bold"
  | "italic"
  | "h1"
  | "h2"
  | "ul"
  | "ol"
  | "blockquote";

export type MarkdownConfigType = {
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

function debug(
  beforeText: string,
  selectedText: string,
  afterText: string,
  log = true
) {
  if (log) {
    console.log(
      `beforeText: ${JSON.stringify(
        beforeText,
        null,
        2
      )}, selectedText: ${JSON.stringify(
        selectedText,
        null,
        2
      )}, afterText: ${JSON.stringify(afterText, null, 2)}`
    );
  }
}

export function useMarkdownSyntax(
  textareaValue = "",
  textareaRef: React.RefObject<HTMLTextAreaElement>
) {
  const [text, setText] = useState(textareaValue);

  const applyMarkdownSyntax = useCallback(
    (style: MarkdownStyle) => {
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
        let beforeText = text.substring(0, selectionStart);
        const selectedText = text.substring(selectionStart, selectionEnd);
        const afterText = text.substring(selectionEnd);

        debug(beforeText, selectedText, afterText);

        if (config.syntaxType === "prepend" && beforeText.slice(-1) !== "\n") {
          beforeText = `${beforeText}\n`;
        }

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
        setText(`${beforeText}${styledText}${afterText}`);
        // note: update the ref inside a setTimeout function to ensure the callstack is clear
        setTimeout(() => {
          if (selectedText.length === 0) {
            const syntaxOffset =
              config.syntaxType === "wrap" ? config.syntax.length : 0;
            textareaRef.current?.setSelectionRange(
              beforeText.length + config.syntax.length,
              beforeText.length + styledText.length - syntaxOffset
            );
            textareaRef.current?.focus();
          } else {
            const newCursorPosition = beforeText.length + styledText.length;
            textareaRef.current?.setSelectionRange(
              newCursorPosition,
              newCursorPosition
            );
            textareaRef.current?.focus();
          }
        }, 0);
      }
    },
    [text]
  );

  return { text, setText, applyMarkdownSyntax };
}
