/* eslint-disable @typescript-eslint/no-unused-vars */
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

export default function ZalgComposer({
  toggleOpenState,
  replyToPostNumber,
}: {
  toggleOpenState: () => void;
  replyToPostNumber?: string;
}) {
  const submitFetcher = useFetcher<JobData>({ key: "submit" });
  const responseFetcher = useFetcher<ApiResponse>({ key: "commentResponse" });
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (
      submitFetcher.data &&
      submitFetcher.data.job &&
      submitFetcher.data.job !== jobId
    ) {
      setJobId(submitFetcher.data.job);
      console.log(`setting jobId to ${submitFetcher.data.job}`);
    }
  }, [submitFetcher.data, jobId]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (jobId && !result) {
      intervalId = setInterval(async () => {
        const url = `/api/postCommentResponse?jobId=${jobId}`;
        responseFetcher.load(url);
      }, 1000);
      return () => clearInterval(intervalId);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [jobId, result, responseFetcher]);

  useEffect(() => {
    if (responseFetcher.data && responseFetcher.data.message) {
      setResult(responseFetcher.data.message);
      console.log(`responseFetcher message: ${responseFetcher.data.message}`);
    }
  }, [result, responseFetcher]);

  return (
    <Composer
      submitType="markdown"
      fetcher={submitFetcher as CustomFetcher}
      toggleOpenState={toggleOpenState}
      replyToPostNumber={replyToPostNumber}
    />
  );
}