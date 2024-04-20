import type { MarkdownStyle } from "~/hooks/useMarkdownSyntax";

export type MarkdownButtonProps = {
  style: MarkdownStyle;
  label: string;
  applyMarkdownSyntax: (style: MarkdownStyle) => void;
};

export default function MarkdownButton({
  style,
  label,
  applyMarkdownSyntax,
}: MarkdownButtonProps) {
  return (
    <button
      className="px-2 py-1 m-1 bg-slate-50 text-slate-900 border border-slate-900 rounded-md"
      onClick={(event) => {
        event.preventDefault();
        applyMarkdownSyntax(style);
      }}
    >
      {label}
    </button>
  );
}
