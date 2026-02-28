/**
 * Rate Limiting Middleware
 * 
 * Middleware to check rate limits before handler execution.
 * Enforces IP-based and user-based rate limits and logs violations.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { rateLimitService } from './rate-limit-service';
import { auditLogService } from './audit-log-service';

/**
 * Authentication endpoints that require stricter rate limits
 */
const AUTH_ENDPOINTS = [
  '/auth/register',
  '/auth/login',
  '/auth/verify',
  '/auth/password-reset-request',
  '/auth/password-reset',
  '/auth/resend-verification',
];

/**
 * Extract IP address from API Gateway event
 */
function getIPAddress(event: APIGatewayProxyEvent): string {
  // Check X-Forwarded-For header first (set by API Gateway)
  const forwardedFor = event.headers['X-Forwarded-For'] || event.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to sourceIp from request context
  return event.requestContext?.identity?.sourceIp || 'unknown';
}

/**
 * Extract user ID from session token in Authorization header
 * Returns null if no valid session token is present
 */
function getUserIdFromToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];
  if (!authHeader) {
    return null;
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  // In a real implementation, we would decode the JWT token here
  // For now, we'll return null to indicate no user-based rate limiting
  // This will be implemented when session validation is integrated
  return null;
}

/**
 * Check if the endpoint is an authentication endpoint
 */
function isAuthEndpoint(event: APIGatewayProxyEvent): boolean {
  const path = event.path || event.resource;
  return AUTH_ENDPOINTS.some(endpoint => path.includes(endpoint));
}

/**
 * Rate limiting middleware
 * 
 * Checks IP-based and user-based rate limits before allowing request to proceed.
 * Returns HTTP 429 with Retry-After header when limit is exceeded.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.6
 */
export async function rateLimitMiddleware(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult | null> {
  const ipAddress = getIPAddress(event);
  const isAuth = isAuthEndpoint(event);

  // Check IP-based rate limit (Requirement 6.1, 6.6)
  const ipRateLimit = await rateLimitService.checkIPRateLimit(ipAddress, isAuth);
  
  if (!ipRateLimit.allowed) {
    // Log rate limit violation (Requirement 6.4)
    await auditLogService.logRateLimitEvent(ipAddress, 0, {
      endpoint: event.path,
      limitType: 'ip',
      isAuthEndpoint: isAuth,
    });

    // Return HTTP 429 with Retry-After header (Requirement 6.3)
    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': ipRateLimit.retryAfter?.toString() || '60',
      },
      body: JSON.stringify({
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: ipRateLimit.retryAfter,
      }),
    };
  }

  // Record IP-based request (Requirement 6.5)
  const windowSeconds = isAuth ? 60 : 60; // 1 minute window for both
  await rateLimitService.recordRequest(`ip:${ipAddress}`, windowSeconds);

  // Check user-based rate limit if authenticated (Requirement 6.2)
  const userId = getUserIdFromToken(event);
  if (userId) {
    const userRateLimit = await rateLimitService.checkUserRateLimit(userId);
    
    if (!userRateLimit.allowed) {
      // Log rate limit violation (Requirement 6.4)
      await auditLogService.logRateLimitEvent(ipAddress, 0, {
        endpoint: event.path,
        limitType: 'user',
        userId,
      });

      // Return HTTP 429 with Retry-After header (Requirement 6.3)
      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': userRateLimit.retryAfter?.toString() || '3600',
        },
        body: JSON.stringify({
          error: 'Too many requests',
          message: 'User rate limit exceeded. Please try again later.',
          retryAfter: userRateLimit.retryAfter,
        }),
      };
    }

    // Record user-based request (Requirement 6.5)
    await rateLimitService.recordRequest(`user:${userId}`, 3600); // 1 hour window
  }

  // Rate limit check passed, allow request to proceed
  return null;
}
