import { useEffect, useMemo, useState } from "react";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { PlainTextPlugin } from "@lexical/react/LexicalPlainTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import LexicalErrorBoundary from "@lexical/react/LexicalErrorBoundary";

export default function LexicalTest() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  function onError(error: Error) {
    console.error(error);
  }

  const theme = {
    // Default styles for text
    text: {
      color: "#333", // Text color
    },

    // Styles for the content editable area
    "content-editable": {
      borderColor: "rgba(255,211,2,0.68)",
      border: "2px solid red",
      borderRadius: "5px",
      maxWidth: "100%",
      padding: "10px",
      minHeight: "100px", // Ensures the editable area is visible even if empty
      outline: "none", // Removes outline on focus for browsers
    },
  };

  const initialConfig = {
    namespace: "LexicalTest",
    theme,
    onError,
  };

  const CustomContent = useMemo(() => {
    return <ContentEditable />;
  }, []);

  if (!isClient) {
    return (
      <div>
        <textarea />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-sm">
      <LexicalComposer initialConfig={initialConfig}>
        <PlainTextPlugin
          contentEditable={CustomContent}
          placeholder={<div>This is a test...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
      </LexicalComposer>
    </div>
  );
}
