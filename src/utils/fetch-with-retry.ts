export interface FetchOptions extends RequestInit {
  retryOptions?: {
    maxRetries?: number;
    timeoutMs?: number;
    backoffDelayMs?: number;
  };
}

const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_BACKOFF_DELAY_MS = 1000;

export async function fetchWithRetry(
  url: string,
  init?: FetchOptions,
): Promise<Response> {
  const maxRetries = init?.retryOptions?.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = init?.retryOptions?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const backoffDelayMs = init?.retryOptions?.backoffDelayMs ??
    DEFAULT_BACKOFF_DELAY_MS;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return response;
    } catch (error) {
      clearTimeout(
        setTimeout(() => {}, 0),
      );
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = backoffDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to fetch after retries");
}
