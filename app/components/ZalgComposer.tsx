import { useFetcher } from "@remix-run/react";
import { useEffect, useRef, useState } from "react";
import Composer from "~/components/ZalgEditor/Composer";
import { CustomFetcher } from "~/components/ZalgEditor/plugins/SubmitPlugin";

type JobData = {
  job: string;
};

type ApiResponse = {
  message: string;
};

type ZalgComposerProps = {
  toggleOpenState: () => void;
  handleComposerMessage: (message: string) => void;
  replyToPostNumber?: string;
};

export default function ZalgComposer({
  toggleOpenState,
  handleComposerMessage,
  replyToPostNumber,
}: ZalgComposerProps) {
  const submitFetcher = useFetcher<JobData>({ key: "submit" });
  const responseFetcher = useFetcher<ApiResponse>({ key: "commentResponse" });
  const [jobId, setJobId] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);
  const retriesRef = useRef(0);
  const maxRetries = 10;

  useEffect(() => {
    if (submitFetcher.data && submitFetcher.data.job) {
      setJobId(submitFetcher.data.job);
    }
  }, [submitFetcher.data]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (jobId && !messageSent && retriesRef.current < maxRetries) {
      intervalId = setInterval(async () => {
        const url = `/api/postCommentResponse?jobId=${jobId}`;
        responseFetcher.load(url);
        retriesRef.current += 1;

        if (retriesRef.current >= maxRetries) {
          clearInterval(intervalId);
        }
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, messageSent, responseFetcher]);

  useEffect(() => {
    if (responseFetcher.data && responseFetcher.data.message) {
      setMessageSent(true);
      handleComposerMessage(responseFetcher.data.message);
    }
  }, [responseFetcher, handleComposerMessage]);

  return (
    <Composer
      submitType="markdown"
      fetcher={submitFetcher as CustomFetcher}
      toggleOpenState={toggleOpenState}
      replyToPostNumber={replyToPostNumber}
    />
  );
}
