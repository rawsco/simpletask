/**
 * Security Headers Middleware
 * 
 * Adds security headers to all HTTP responses to protect against common web vulnerabilities.
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7
 */

import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Security headers to be added to all responses
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.7
 */
const SECURITY_HEADERS = {
  // Content Security Policy - restricts resource loading to trusted sources (Requirement 12.1)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'", // Allow inline scripts for React
    "style-src 'self' 'unsafe-inline'", // Allow inline styles
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),

  // Prevent clickjacking attacks (Requirement 12.2)
  'X-Frame-Options': 'DENY',

  // Prevent MIME-type sniffing (Requirement 12.3)
  'X-Content-Type-Options': 'nosniff',

  // Enforce HTTPS with HSTS (Requirement 12.4)
  // max-age=31536000 = 1 year in seconds
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

  // Control referrer information (Requirement 12.5)
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Legacy XSS protection for older browsers (Requirement 12.7)
  'X-XSS-Protection': '1; mode=block',

  // Permissions Policy - restrict browser features
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

/**
 * Add security headers to a response
 * 
 * @param response - The API Gateway response object
 * @returns The response with security headers added
 */
export function addSecurityHeaders(response: APIGatewayProxyResult): APIGatewayProxyResult {
  return {
    ...response,
    headers: {
      ...response.headers,
      ...SECURITY_HEADERS,
    },
  };
}

/**
 * Security headers middleware wrapper
 * 
 * Wraps a Lambda handler to automatically add security headers to all responses.
 * 
 * @param handler - The Lambda handler function to wrap
 * @returns A wrapped handler that adds security headers
 */
export function withSecurityHeaders<TEvent, TResult extends APIGatewayProxyResult>(
  handler: (event: TEvent) => Promise<TResult>
): (event: TEvent) => Promise<TResult> {
  return async (event: TEvent): Promise<TResult> => {
    const response = await handler(event);
    return addSecurityHeaders(response) as TResult;
  };
}
