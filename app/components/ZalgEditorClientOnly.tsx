import { useFetcher } from "@remix-run/react";
import { ClientOnly } from "~/components/ClientOnly";
import Composer from "~/components/ZalgEditor/Composer";
import { CustomFetcher } from "~/components/ZalgEditor/plugins/SubmitPlugin";

export default function ZalgEditorClientOnly({
  toggleOpenState,
  replyToPostNumber,
}: {
  toggleOpenState: () => void;
  replyToPostNumber?: string;
}) {
  const submitFetcher = useFetcher({ key: "submit" });
  if (submitFetcher.data) {
    console.log(
      `submitFetcher.data: ${JSON.stringify(submitFetcher.data, null, 2)}`
    );
  }
  return (
    <ClientOnly
      fallback={
        <div className="max-w-full p-2 border rounded-sm min-h-48 border-slate-500"></div>
      }
    >
      {() => (
        <Composer
          submitType="markdown"
          fetcher={submitFetcher as CustomFetcher}
          toggleOpenState={toggleOpenState}
          replyToPostNumber={replyToPostNumber}
        />
      )}
    </ClientOnly>
  );
}
