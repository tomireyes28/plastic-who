/** Every store request is bounded; an adapter cannot leave a scheduled run waiting forever. */
export function fetchStore(input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> {
  const deadline = AbortSignal.timeout(20000);
  const signal = init?.signal ? AbortSignal.any([init.signal, deadline]) : deadline;
  return fetch(input, { ...init, signal });
}
