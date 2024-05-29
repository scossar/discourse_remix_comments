import { Queue } from "bullmq";
import { connection } from "~/services/redis/redisClient.server";

export const apiRequestQueue = new Queue("api-request", {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
  connection,
});
