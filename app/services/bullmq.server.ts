import { Queue } from "bullmq";

export const apiRequestQueue = new Queue("api-request", {
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: 1000,
  },
  connection: {
    db: 1,
  },
});
