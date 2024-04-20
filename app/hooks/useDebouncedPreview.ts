import { useCallback, useEffect, useState } from "react";
import debounce from "debounce";
import { marked } from "marked";
import DOMPurify from "dompurify";

export function useDebouncedPreview(text: string, isOpen: boolean) {
  const [preview, setPreview] = useState("");
  const renderedPreview = useCallback(async (raw: string) => {
    try {
      const cleaned = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [] });
      const html = await marked.parse(cleaned);
      setPreview(html);
    } catch (error) {
      console.error("Failed to render preview:", error);
      setPreview("Error generating preview.");
    }
  }, []);

  useEffect(() => {
    const handler = debounce(renderedPreview, 500);
    if (isOpen && text) {
      handler(text);
    }
    return () => handler.clear();
  }, [text, isOpen, renderedPreview]);

  return preview;
}
