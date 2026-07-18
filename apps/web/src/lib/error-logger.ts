/**
 * Production-grade client-side error logger.
 *
 * - Generates a unique error ID for each error (for support correlation)
 * - Strips sensitive data (tokens, passwords, API keys, cookies)
 * - Logs structured error data to the backend
 * - Never exposes stack traces or internal details to end users
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** Patterns to scrub from error messages and metadata */
const SENSITIVE_PATTERNS = [
  /password[=:]\s*\S+/gi,
  /token[=:]\s*\S+/gi,
  /secret[=:]\s*\S+/gi,
  /api[_-]?key[=:]\s*\S+/gi,
  /authorization[=:]\s*\S+/gi,
  /bearer\s+\S+/gi,
  /cookie[=:]\s*\S+/gi,
  /session[=:]\s*\S+/gi,
  /jwt[=:]\s*\S+/gi,
];

/** Generate a short, unique error ID for support correlation */
function generateErrorId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ERR-${timestamp}-${random}`.toUpperCase();
}

/** Scrub sensitive data from a string */
function scrubSensitive(value: string): string {
  let scrubbed = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  }
  return scrubbed;
}

/** Recursively scrub sensitive data from an object */
function scrubObject(obj: unknown): unknown {
  if (typeof obj === 'string') return scrubSensitive(obj);
  if (Array.isArray(obj)) return obj.map(scrubObject);
  if (obj && typeof obj === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      // Redact entire values for sensitive keys
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('api_key') ||
        lowerKey.includes('apikey') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('cookie') ||
        lowerKey.includes('session') ||
        lowerKey.includes('jwt')
      ) {
        scrubbed[key] = '[REDACTED]';
      } else {
        scrubbed[key] = scrubObject(value);
      }
    }
    return scrubbed;
  }
  return obj;
}

/** Extract safe error info without exposing internals */
function extractErrorInfo(error: Error | unknown): {
  name: string;
  message: string;
  digest?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      // Never expose stack traces or internal messages to the client
      message: 'An unexpected error occurred',
      digest: 'digest' in error ? (error.digest as string) : undefined,
    };
  }
  return {
    name: 'Error',
    message: 'An unexpected error occurred',
  };
}

/** Log an error to the backend for monitoring/alerting */
async function sendToBackend(payload: {
  errorId: string;
  level: 'error' | 'warning';
  message: string;
  source: string;
  url: string;
  timestamp: string;
  componentStack?: string;
  userId?: string;
}) {
  try {
    await fetch(`${API_BASE}/api/errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Fire and forget — don't block UI on logging
      keepalive: true,
    });
  } catch {
    // Backend logging failed — fall through to console
  }
}

/**
 * Log a client-side error with production-grade practices.
 *
 * @returns The error ID (for displaying to users as a support reference)
 */
export function logError(
  error: Error | unknown,
  context: {
    source: string; // e.g. "global-error-boundary", "route-error-boundary"
    componentStack?: string;
    silent?: boolean; // If true, don't show toast (default: false)
  }
): string {
  const errorId = generateErrorId();
  const errorInfo = extractErrorInfo(error);
  const url = typeof window !== 'undefined' ? window.location.href : 'unknown';

  // Structured log to console (development)
  if (process.env.NODE_ENV === 'development') {
    console.groupCollapsed(
      `🔴 [${errorId}] ${context.source}: ${errorInfo.message}`
    );
    console.error('Error:', error);
    console.error('URL:', url);
    if (context.componentStack) {
      console.error('Component Stack:', context.componentStack);
    }
    console.groupEnd();
  }

  // Send structured payload to backend
  // Scrub the original error message for safe transport
  const originalMessage =
    error instanceof Error ? scrubSensitive(error.message) : 'Unknown error';

  sendToBackend({
    errorId,
    level: 'error',
    message: originalMessage,
    source: context.source,
    url: scrubSensitive(url),
    timestamp: new Date().toISOString(),
    componentStack: context.componentStack
      ? scrubSensitive(context.componentStack)
      : undefined,
  });

  return errorId;
}

/**
 * Get a user-friendly error message.
 * Never exposes internal details.
 */
export function getUserFriendlyMessage(error: Error | unknown): string {
  if (error instanceof Error) {
    const name = error.name.toLowerCase();
    if (name.includes('network') || name.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (name.includes('timeout')) {
      return 'The request took too long. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
