/**
 * Error Handler Utility
 * 
 * Provides centralized error handling and logging functionality.
 * Integrates with notification system for user feedback.
 */

/**
 * Application error codes
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Error title mapping
 */
const ERROR_TITLES: Record<ErrorCode, string> = {
  [ErrorCode.VALIDATION_ERROR]: 'Validation Error',
  [ErrorCode.NETWORK_ERROR]: 'Network Error',
  [ErrorCode.AUTH_ERROR]: 'Authentication Error',
  [ErrorCode.AUTHORIZATION_ERROR]: 'Permission Denied',
  [ErrorCode.NOT_FOUND]: 'Not Found',
  [ErrorCode.CONFLICT]: 'Conflict',
  [ErrorCode.SERVER_ERROR]: 'Server Error',
  [ErrorCode.UNKNOWN_ERROR]: 'Error',
};

/**
 * Get user-friendly error title
 */
export function getErrorTitle(code: ErrorCode): string {
  return ERROR_TITLES[code] || 'Error';
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error to console and external services
 */
export function logError(error: unknown, context?: Record<string, any>): void {
  console.error('Error:', error, context);
  
  // TODO: Integrate with external error logging service (e.g., Sentry, LogRocket)
  // Example:
  // if (window.Sentry) {
  //   window.Sentry.captureException(error, { extra: context });
  // }
}

/**
 * Handle error with logging and user notification
 * 
 * @param error - The error to handle
 * @param context - Additional context for logging
 * @returns Error information for display
 */
export function handleError(
  error: unknown,
  context?: Record<string, any>
): { title: string; message: string; code?: ErrorCode } {
  // Log the error
  logError(error, context);
  
  // Extract error information
  if (error instanceof AppError) {
    return {
      title: getErrorTitle(error.code),
      message: error.message,
      code: error.code,
    };
  }
  
  if (error instanceof Error) {
    return {
      title: 'Error',
      message: error.message || 'An unexpected error occurred. Please try again.',
    };
  }
  
  return {
    title: 'Error',
    message: 'Something went wrong. Please try again.',
  };
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === ErrorCode.NETWORK_ERROR;
  }
  
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('timeout')
    );
  }
  
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === ErrorCode.AUTH_ERROR;
  }
  
  return false;
}

/**
 * Create an AppError from an API response
 */
export function createErrorFromResponse(
  statusCode: number,
  message?: string,
  details?: any
): AppError {
  let code: ErrorCode;
  let defaultMessage: string;
  
  switch (statusCode) {
    case 400:
      code = ErrorCode.VALIDATION_ERROR;
      defaultMessage = 'Invalid request. Please check your input.';
      break;
    case 401:
      code = ErrorCode.AUTH_ERROR;
      defaultMessage = 'Authentication required. Please log in.';
      break;
    case 403:
      code = ErrorCode.AUTHORIZATION_ERROR;
      defaultMessage = 'You do not have permission to perform this action.';
      break;
    case 404:
      code = ErrorCode.NOT_FOUND;
      defaultMessage = 'The requested resource was not found.';
      break;
    case 409:
      code = ErrorCode.CONFLICT;
      defaultMessage = 'A conflict occurred. Please try again.';
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      code = ErrorCode.SERVER_ERROR;
      defaultMessage = 'Server error. Please try again later.';
      break;
    default:
      code = ErrorCode.UNKNOWN_ERROR;
      defaultMessage = 'An unexpected error occurred.';
  }
  
  return new AppError(message || defaultMessage, code, statusCode, details);
}
