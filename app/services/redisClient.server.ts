import Redis from "ioredis";

let client: Redis | null = null;

export const getRedisClient = async () => {
  if (!client) {
    client = new Redis({
      port: 6379,
      host: "127.0.0.1",
      db: 1,
    });
    client.on("error", (err) => console.error("Redis Client Error", err));
    client.on("connect", () => console.log("Redis client connected"));
  }
  return client;
};
