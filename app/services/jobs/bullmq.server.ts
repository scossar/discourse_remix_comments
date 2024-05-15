import { Queue } from "bullmq";
import { connection } from "~/services/redisClient.server";

export const apiRequestQueue = new Queue("api-request", {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
  connection,
});
