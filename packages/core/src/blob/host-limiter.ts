export type HostLimiter = {
  acquire: (host: string) => boolean;
  release: (host: string) => void;
};

export const createHostLimiter = (maxConcurrent: number): HostLimiter => {
  const counts = new Map<string, number>();

  const acquire = (host: string): boolean => {
    const current = counts.get(host) ?? 0;
    if (current >= maxConcurrent) {
      return false;
    }
    counts.set(host, current + 1);
    return true;
  };

  const release = (host: string): void => {
    const current = counts.get(host) ?? 0;
    if (current <= 1) {
      counts.delete(host);
    } else {
      counts.set(host, current - 1);
    }
  };

  return { acquire, release };
};
