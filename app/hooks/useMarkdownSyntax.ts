import { useCallback, useState } from "react";

export type MarkdownStyle =
  | "bold"
  | "italic"
  | "h1"
  | "h2"
  | "ul"
  | "ol"
  | "blockquote";

export type SyntaxType = "prepend" | "wrap";

export type MarkdownConfigType = {
  [key: string]: {
    syntax: string;
    syntaxType: SyntaxType;
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

function debug(before: string, selected: string, after: string, log = true) {
  if (log) {
    console.log(
      `before: ${JSON.stringify(before, null, 2)}, selected: ${JSON.stringify(
        selected,
        null,
        2
      )}, after: ${JSON.stringify(after, null, 2)}`
    );
  }
}

function divisions(
  start: number,
  end: number,
  syntaxType: SyntaxType,
  text: string
) {
  let before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end);
  if (
    syntaxType === "prepend" &&
    before.length > 0 &&
    before.slice(-1) !== "\n"
  ) {
    before = `${before}\n`;
  }

  return { before, selected, after };
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

      const selectionStart = Number(textareaRef.current?.selectionStart) || 0;
      const selectionEnd = Number(textareaRef.current?.selectionEnd) || 0;

      const { before, selected, after } = divisions(
        selectionStart,
        selectionEnd,
        config.syntaxType,
        text
      );
      debug(before, selected, after);

      let beforeText = text.substring(0, selectionStart);
      const selectedText = text.substring(selectionStart, selectionEnd);
      const afterText = text.substring(selectionEnd);

      if (
        config.syntaxType === "prepend" &&
        beforeText.length > 0 &&
        beforeText.slice(-1) !== "\n"
      ) {
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
    },
    [text]
  );

  return { text, setText, applyMarkdownSyntax };
}
