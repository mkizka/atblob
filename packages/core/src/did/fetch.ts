export type DidFetch = typeof fetch;

export const createDidFetch = (deps: {
  didResolveTimeout: number;
}): DidFetch => {
  return (input, init) =>
    fetch(input, {
      ...init,
      signal: AbortSignal.timeout(deps.didResolveTimeout),
    });
};
