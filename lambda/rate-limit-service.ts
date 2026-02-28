/**
 * Rate Limit Service
 * 
 * Manages rate limiting across different scopes:
 * - IP-based rate limiting: 100 req/min (10 req/min for auth endpoints)
 * - User-based rate limiting: 1000 req/hour
 * 
 * Uses DynamoDB RateLimits table to track request counts with automatic
 * counter reset after time window expires via TTL.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.5, 6.6
 */

import { dynamoDBClient, TableNames } from './dynamodb-client';
import { RateLimit, RateLimitResult } from './types';

/**
 * Rate limit configuration constants
 */
const IP_RATE_LIMIT_REQUESTS = 100;
const IP_RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute

const AUTH_IP_RATE_LIMIT_REQUESTS = 10;
const AUTH_IP_RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute

const USER_RATE_LIMIT_REQUESTS = 1000;
const USER_RATE_LIMIT_WINDOW_SECONDS = 3600; // 1 hour

/**
 * Rate Limit Service class
 */
export class RateLimitService {
  /**
   * Check IP-based rate limit
   * Requirements: 6.1, 6.6
   * 
   * @param ipAddress - The IP address to check
   * @param isAuthEndpoint - Whether this is an authentication endpoint (stricter limits)
   * @returns RateLimitResult indicating if request is allowed
   */
  async checkIPRateLimit(ipAddress: string, isAuthEndpoint: boolean = false): Promise<RateLimitResult> {
    const limitKey = `ip:${ipAddress}`;
    const maxRequests = isAuthEndpoint ? AUTH_IP_RATE_LIMIT_REQUESTS : IP_RATE_LIMIT_REQUESTS;
    const windowSeconds = isAuthEndpoint ? AUTH_IP_RATE_LIMIT_WINDOW_SECONDS : IP_RATE_LIMIT_WINDOW_SECONDS;

    return this.checkRateLimit(limitKey, maxRequests, windowSeconds);
  }

  /**
   * Check user-based rate limit
   * Requirements: 6.2
   * 
   * @param userId - The user ID to check
   * @returns RateLimitResult indicating if request is allowed
   */
  async checkUserRateLimit(userId: string): Promise<RateLimitResult> {
    const limitKey = `user:${userId}`;
    return this.checkRateLimit(limitKey, USER_RATE_LIMIT_REQUESTS, USER_RATE_LIMIT_WINDOW_SECONDS);
  }

  /**
   * Generic rate limit check
   * 
   * @param limitKey - The key to check (format: "ip:{address}" or "user:{userId}")
   * @param maxRequests - Maximum number of requests allowed in the window
   * @param windowSeconds - Time window in seconds
   * @returns RateLimitResult indicating if request is allowed
   */
  private async checkRateLimit(
    limitKey: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = this.getWindowStart(now, windowSeconds);

    // Query for the current window
    const rateLimits = await dynamoDBClient.query<RateLimit>({
      TableName: TableNames.RATE_LIMITS,
      KeyConditionExpression: 'limitKey = :limitKey AND windowStart = :windowStart',
      ExpressionAttributeValues: {
        ':limitKey': limitKey,
        ':windowStart': windowStart,
      },
    });

    const currentLimit = rateLimits.length > 0 ? rateLimits[0] : null;

    if (!currentLimit) {
      // No record exists, request is allowed
      return { allowed: true };
    }

    // Check if limit is exceeded
    if (currentLimit.requestCount >= maxRequests) {
      const retryAfter = this.getRetryAfter(windowStart, windowSeconds);
      return {
        allowed: false,
        retryAfter,
      };
    }

    return { allowed: true };
  }

  /**
   * Record a request and increment the counter
   * Requirements: 6.5
   * 
   * @param limitKey - The key to record (format: "ip:{address}" or "user:{userId}")
   * @param windowSeconds - Time window in seconds
   */
  async recordRequest(limitKey: string, windowSeconds: number): Promise<void> {
    const now = Date.now();
    const windowStart = this.getWindowStart(now, windowSeconds);
    const expiresAt = windowStart + windowSeconds * 1000 + 60000; // Add 1 minute buffer for TTL

    try {
      // Try to increment existing counter
      await dynamoDBClient.update({
        TableName: TableNames.RATE_LIMITS,
        Key: {
          limitKey,
          windowStart,
        },
        UpdateExpression: 'SET requestCount = if_not_exists(requestCount, :zero) + :inc, expiresAt = :expiresAt',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
          ':expiresAt': expiresAt,
        },
      });
    } catch (error: any) {
      // If update fails, create new record
      const rateLimit: RateLimit = {
        limitKey,
        windowStart,
        requestCount: 1,
        expiresAt,
      };

      await dynamoDBClient.put({
        TableName: TableNames.RATE_LIMITS,
        Item: rateLimit,
      });
    }
  }

  /**
   * Calculate retry delay in seconds
   * Requirements: 6.3
   * 
   * @param windowStart - The start of the current time window
   * @param windowSeconds - Time window in seconds
   * @returns Number of seconds until requests will be accepted again
   */
  getRetryAfter(windowStart: number, windowSeconds: number): number {
    const now = Date.now();
    const windowEnd = windowStart + windowSeconds * 1000;
    const retryAfterMs = windowEnd - now;
    
    // Return seconds, rounded up
    return Math.ceil(retryAfterMs / 1000);
  }

  /**
   * Get the start of the current time window
   * Requirements: 6.5
   * 
   * @param timestamp - Current timestamp in milliseconds
   * @param windowSeconds - Time window in seconds
   * @returns Timestamp of the window start in milliseconds
   */
  private getWindowStart(timestamp: number, windowSeconds: number): number {
    const windowMs = windowSeconds * 1000;
    return Math.floor(timestamp / windowMs) * windowMs;
  }

  /**
   * Reset counter for a specific key (for testing or manual reset)
   * 
   * @param limitKey - The key to reset
   * @param windowSeconds - Time window in seconds
   */
  async resetCounter(limitKey: string, windowSeconds: number): Promise<void> {
    const now = Date.now();
    const windowStart = this.getWindowStart(now, windowSeconds);

    await dynamoDBClient.delete({
      TableName: TableNames.RATE_LIMITS,
      Key: {
        limitKey,
        windowStart,
      },
    });
  }
}

/**
 * Create and export a singleton instance
 */
export const rateLimitService = new RateLimitService();
