/**
 * Network utilities for handling slow/weak internet connections
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  exponentialBackoff?: boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  timeout: 30000, // 30 seconds
  exponentialBackoff: true,
};

/**
 * Wraps a promise with timeout and retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  onRetry?: (attempt: number) => void
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى")),
          opts.timeout
        );
      });

      // Race between the function and timeout
      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof Error &&
        (error.message.includes("Invalid login credentials") ||
          error.message.includes("already registered") ||
          error.message.includes("اسم المستخدم محجوز") ||
          error.message.includes("User not found"))
      ) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        break;
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1);
      }

      // Calculate delay with exponential backoff
      const delay = opts.exponentialBackoff
        ? opts.retryDelay * Math.pow(2, attempt)
        : opts.retryDelay;

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // If we get here, all retries failed
  if (lastError) {
    // Improve error message for timeout/network issues
    if (
      lastError.message.includes("timeout") ||
      lastError.message.includes("network") ||
      lastError.message.includes("fetch") ||
      lastError.message.includes("انتهت مهلة")
    ) {
      throw new Error(
        "فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى"
      );
    }
    throw lastError;
  }

  throw new Error("حدث خطأ غير متوقع");
}

/**
 * Checks if the error is a network/timeout error
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("انتهت مهلة")
  );
}

/**
 * Gets a user-friendly error message based on error type
 */
export function getNetworkErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى";
  }

  const message = error.message.toLowerCase();

  if (message.includes("timeout") || message.includes("انتهت مهلة")) {
    return "انتهت مهلة الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى";
  }

  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "فشل الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى";
  }

  return error.message;
}
