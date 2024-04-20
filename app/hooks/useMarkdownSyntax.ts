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

export type Delimiter = "\n\n" | "\n";

export type MarkdownConfig = {
  syntax: string;
  syntaxType: SyntaxType;
  placeholder: string;
  delimiter: Delimiter;
};

export type MarkdownConfigType = {
  [key: string]: {
    syntax: string;
    syntaxType: SyntaxType;
    placeholder: string;
    delimiter: Delimiter;
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

function textDivisions(
  start: number,
  end: number,
  text: string,
  config: MarkdownConfig
) {
  let before = text.substring(0, start);
  const selected = text.substring(start, end);
  const after = text.substring(end);
  if (
    config.syntaxType === "prepend" &&
    before.length > 0 &&
    before.slice(-1) !== "\n"
  ) {
    before = `${before}\n`;
  }

  return { before, selected, after };
}

function styleSelected(selected: string, config: MarkdownConfig) {
  let styled = "";
  if (selected.length === 0) {
    styled = `${config.syntax}${config.placeholder}${
      config.syntaxType === "wrap" ? config.syntax : ""
    }`;
  } else {
    const selections = selected.split(config.delimiter);
    styled = selections
      .map((selection) =>
        selection
          ? `${config.syntax}${selection.trim()}${
              config.syntaxType === "wrap" ? config.syntax : ""
            }`
          : selection
      )
      .join(config.delimiter);
  }

  return styled;
}

function setSelectionRange(
  before: string,
  styled: string,
  ref: React.RefObject<HTMLTextAreaElement>,
  config: MarkdownConfig
) {
  const syntaxOffset = config.syntaxType === "wrap" ? config.syntax.length : 0;
  const start = before.length;
  ref.current?.setSelectionRange(
    start + config.syntax.length,
    start + styled.length - syntaxOffset
  );
}

function setCursorPosition(
  before: string,
  styled: string,
  ref: React.RefObject<HTMLTextAreaElement>
) {
  const position = before.length + styled.length;
  ref.current?.setSelectionRange(position, position);
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

      const start = Number(textareaRef.current?.selectionStart) || 0;
      const end = Number(textareaRef.current?.selectionEnd) || 0;

      const { before, selected, after } = textDivisions(
        start,
        end,
        text,
        config
      );
      const styled = styleSelected(selected, config);

      setText(`${before}${styled}${after}`);
      setTimeout(() => {
        if (selected.length === 0) {
          setSelectionRange(before, styled, textareaRef, config);
        } else {
          setCursorPosition(before, styled, textareaRef);
        }
        textareaRef.current?.focus();
      }, 0);
    },
    [text]
  );

  return { text, setText, applyMarkdownSyntax };
}
