export type HealthCheckStatus = "ok" | "error";

export type HealthCheckResult = {
  status: HealthCheckStatus;
  checks: Record<string, { status: HealthCheckStatus; error?: string }>;
};

export type HealthCheck = () => Promise<void>;

export const runHealthChecks = async (
  checks: Record<string, HealthCheck>,
): Promise<HealthCheckResult> => {
  const entries = await Promise.all(
    Object.entries(checks).map(async ([name, check]) => {
      try {
        await check();
        return [name, { status: "ok" as const }] as const;
      } catch (cause) {
        return [
          name,
          {
            status: "error" as const,
            error: cause instanceof Error ? cause.message : String(cause),
          },
        ] as const;
      }
    }),
  );
  const resultChecks: HealthCheckResult["checks"] = {};
  for (const [name, result] of entries) {
    resultChecks[name] = result;
  }
  const status: HealthCheckStatus = entries.every(
    ([, result]) => result.status === "ok",
  )
    ? "ok"
    : "error";
  return { status, checks: resultChecks };
};
