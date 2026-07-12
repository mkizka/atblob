export type HealthCheckStatus = "ok" | "error";

export type HealthCheckResult = {
  status: HealthCheckStatus;
  error?: string;
};

export type HealthCheck = () => Promise<HealthCheckResult>;

export interface HealthCheckable {
  checkHealth: HealthCheck;
}

export const createCheckHealth = (deps: {
  didCache: HealthCheckable;
}): HealthCheck => {
  return () => deps.didCache.checkHealth();
};
