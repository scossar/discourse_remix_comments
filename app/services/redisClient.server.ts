import { type RedisClientType, createClient } from "redis";

let client: RedisClientType | null;

export const getRedisClient = async () => {
  if (!client) {
    client = createClient({ url: "redis://localhost:6379/1" });
    client.on("error", (err) => console.error("Redis Client Error", err));
    await client.connect();
  }
  return client;
};
