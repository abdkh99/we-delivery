class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
    
    // This is needed for TypeScript when extending built-in classes
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Enhanced fetcher with timeout, retry, and better error handling
 * Optimized for slow networks
 */
export const fetcher = async (
  url: string,
  options: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<any> => {
  const { timeout = 30000, retries = 3, retryDelay = 1000 } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br',
        },
        // Add cache control for better performance on slow networks
        cache: 'default',
      });

      clearTimeout(timeoutId);

      // Handle 401 Unauthorized - session expired
      if (res.status === 401) {
        // Try to refresh session once
        if (attempt === 0) {
          try {
            const refreshRes = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });

            if (refreshRes.ok) {
              // Retry the original request
              continue;
            }
          } catch {
            // Refresh failed, continue to return error
          }
        }

        throw new ApiError('انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.', 401);
      }

      // Handle 429 Too Many Requests
      if (res.status === 429) {
        const retryAfter = res.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : retryDelay * Math.pow(2, attempt);
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }

      if (!res.ok) {
        const errorText = await res.text().catch(() => 'خطأ غير معروف');
        let errorMessage = 'حدث خطأ أثناء جلب البيانات';

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorJson.message || errorMessage;
        } catch {
          // If not JSON, use status text
          errorMessage = errorText || res.statusText || errorMessage;
        }

        // Don't retry on client errors (4xx) except 429
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new ApiError(errorMessage, res.status);
        }

        // Retry on server errors (5xx) or network errors
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new ApiError(errorMessage, res.status);
      }

      return res.json();
    } catch (error: any) {
      lastError = error;

      // Don't retry on abort (timeout) if it's the last attempt
      if (error.name === 'AbortError') {
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new ApiError('انتهت مهلة الاتصال. يرجى التحقق من اتصالك بالإنترنت.', 408);
      }

      // Don't retry on certain errors
      if (error instanceof ApiError && error.status === 401) {
        throw error;
      }

      // Retry on network errors
      if (attempt < retries && (error.name === 'TypeError' || error.name === 'NetworkError')) {
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt failed
      if (attempt === retries) {
        if (error instanceof ApiError) {
          throw error;
        }
        throw new ApiError(
          error.message || 'فشل الاتصال بالخادم. يرجى المحاولة مرة أخرى.',
          500
        );
      }
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new ApiError('حدث خطأ غير متوقع', 500);
};

export default fetcher;
