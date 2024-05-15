import { apiRequestQueue } from "~/services/bullmq.server";

type ApiJobArgs = {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  headers: Headers;
};

export async function addJobToQueue({ endpoint, method, headers }: ApiJobArgs) {
  const job = await apiRequestQueue.add(
    "apiRequest",
    {
      endpoint,
      method,
      headers,
    },
    {
      delay: 1000,
      attempts: 5,
      backoff: 3000,
    }
  );

  return job.returnvalue;
}
