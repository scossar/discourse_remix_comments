import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (
      submitFetcher.data &&
      submitFetcher.data.job &&
      submitFetcher.data.job !== jobId
    ) {
      setJobId(submitFetcher.data.job);
    }
  }, [submitFetcher.data, jobId]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (jobId && !messageSent) {
      intervalId = setInterval(async () => {
        const url = `/api/postCommentResponse?jobId=${jobId}`;
        responseFetcher.load(url);
      }, 1000);
      return () => clearInterval(intervalId);
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
  }, [messageSent, responseFetcher, handleComposerMessage]);

  return (
    <Composer
      submitType="markdown"
      fetcher={submitFetcher as CustomFetcher}
      toggleOpenState={toggleOpenState}
      replyToPostNumber={replyToPostNumber}
    />
  );
}
