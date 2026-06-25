/**
 * Wraps a promise with a timeout to enforce SLA requirements.
 * @param promise The promise to execute.
 * @param ms Timeout in milliseconds.
 * @param errorMessage Error message if timeout is reached.
 * @returns The result of the promise or rejects with a timeout error.
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out'
): Promise<T> => {
  let timeoutId: NodeJS.Timeout;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
};
