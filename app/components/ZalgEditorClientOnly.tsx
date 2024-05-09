import { useFetcher } from "@remix-run/react";
import { ClientOnly } from "~/components/ClientOnly";
import Composer from "~/components/ZalgEditor/Composer";
import { CustomFetcher } from "~/components/ZalgEditor/plugins/SubmitPlugin";

export default function ZalgEditorClientOnly({
  toggleOpenState,
  replyToPostNumber,
}: {
  toggleOpenState: () => void;
  replyToPostNumber?: number;
}) {
  const submitFetcher = useFetcher({ key: "submit" });
  return (
    <ClientOnly
      fallback={
        <div className="max-w-full p-2 border rounded-sm min-h-48 border-slate-500"></div>
      }
    >
      {() => (
        <Composer
          submitType="html"
          fetcher={submitFetcher as CustomFetcher}
          toggleOpenState={toggleOpenState}
        />
      )}
    </ClientOnly>
  );
}
