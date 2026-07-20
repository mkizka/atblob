import { RedisContainer } from "@testcontainers/redis";

export type TestRedis = AsyncDisposable & { url: string };

export const startTestRedis = async (): Promise<TestRedis> => {
  const container = await new RedisContainer("redis:8-alpine").start();
  return {
    url: container.getConnectionUrl(),
    [Symbol.asyncDispose]: async () => {
      await container.stop();
    },
  };
};
