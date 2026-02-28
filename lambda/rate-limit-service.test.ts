/**
 * Unit tests for Rate Limit Service
 * 
 * Tests the core functionality of rate limiting including:
 * - IP-based rate limiting
 * - User-based rate limiting
 * - Request recording
 * - Retry-After calculation
 * - Counter reset
 */

import { rateLimitService, RateLimitService } from './rate-limit-service';
import { dynamoDBClient } from './dynamodb-client';
import { RateLimit } from './types';

// Mock DynamoDB client
jest.mock('./dynamodb-client', () => ({
  dynamoDBClient: {
    query: jest.fn(),
    update: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  TableNames: {
    RATE_LIMITS: 'RateLimits',
  },
}));

describe('RateLimitService', () => {
  let service: RateLimitService;

  beforeEach(() => {
    service = new RateLimitService();
    jest.clearAllMocks();
  });

  describe('checkIPRateLimit', () => {
    test('allows request when no rate limit record exists', async () => {
      // Mock empty query result
      (dynamoDBClient.query as jest.Mock).mockResolvedValue([]);

      const result = await service.checkIPRateLimit('192.168.1.1', false);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    test('allows request when under standard IP limit (100 req/min)', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;

      // Mock rate limit record with 50 requests
      const rateLimit: RateLimit = {
        limitKey: 'ip:192.168.1.1',
        windowStart,
        requestCount: 50,
        expiresAt: windowStart + 120000,
      };

      (dynamoDBClient.query as jest.Mock).mockResolvedValue([rateLimit]);

      const result = await service.checkIPRateLimit('192.168.1.1', false);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    test('blocks request when standard IP limit exceeded (100 req/min)', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;

      // Mock rate limit record with 100 requests (at limit)
      const rateLimit: RateLimit = {
        limitKey: 'ip:192.168.1.1',
        windowStart,
        requestCount: 100,
        expiresAt: windowStart + 120000,
      };

      (dynamoDBClient.query as jest.Mock).mockResolvedValue([rateLimit]);

      const result = await service.checkIPRateLimit('192.168.1.1', false);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(60);
    });

    test('applies stricter limit for auth endpoints (10 req/min)', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;

      // Mock rate limit record with 10 requests
      const rateLimit: RateLimit = {
        limitKey: 'ip:192.168.1.1',
        windowStart,
        requestCount: 10,
        expiresAt: windowStart + 120000,
      };

      (dynamoDBClient.query as jest.Mock).mockResolvedValue([rateLimit]);

      const result = await service.checkIPRateLimit('192.168.1.1', true);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('allows request for auth endpoint when under limit (10 req/min)', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 60000) * 60000;

      // Mock rate limit record with 5 requests
      const rateLimit: RateLimit = {
        limitKey: 'ip:192.168.1.1',
        windowStart,
        requestCount: 5,
        expiresAt: windowStart + 120000,
      };

      (dynamoDBClient.query as jest.Mock).mockResolvedValue([rateLimit]);

      const result = await service.checkIPRateLimit('192.168.1.1', true);

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });
  });

  describe('checkUserRateLimit', () => {
    test('allows request when no rate limit record exists', async () => {
      (dynamoDBClient.query as jest.Mock).mockResolvedValue([]);

      const result = await service.checkUserRateLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    test('allows request when under user limit (1000 req/hour)', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 3600000) * 3600000;

      // Mock rate limit record with 500 requests
      const rateLimit: RateLimit = {
        limitKey: 'user:user-123',
        windowStart,
        requestCount: 500,
        expiresAt: windowStart + 3660000,
      };

      (dynamoDBClient.query as jest.Mock).mockResolvedValue([rateLimit]);

      const result = await service.checkUserRateLimit('user-123');

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    test('blocks request when user limit exceeded (1000 req/hour)', async () => {
      const now = Date.now();
      const windowStart = Math.floor(now / 3600000) * 3600000;

      // Mock rate limit record with 1000 requests (at limit)
      const rateLimit: RateLimit = {
        limitKey: 'user:user-123',
        windowStart,
        requestCount: 1000,
        expiresAt: windowStart + 3660000,
      };

      (dynamoDBClient.query as jest.Mock).mockResolvedValue([rateLimit]);

      const result = await service.checkUserRateLimit('user-123');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(3600);
    });
  });

  describe('recordRequest', () => {
    test('increments existing counter', async () => {
      (dynamoDBClient.update as jest.Mock).mockResolvedValue({});

      await service.recordRequest('ip:192.168.1.1', 60);

      expect(dynamoDBClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'RateLimits',
          Key: expect.objectContaining({
            limitKey: 'ip:192.168.1.1',
          }),
          UpdateExpression: expect.stringContaining('requestCount'),
        })
      );
    });

    test('creates new record when update fails', async () => {
      (dynamoDBClient.update as jest.Mock).mockRejectedValue(new Error('Item not found'));
      (dynamoDBClient.put as jest.Mock).mockResolvedValue({});

      await service.recordRequest('ip:192.168.1.1', 60);

      expect(dynamoDBClient.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'RateLimits',
          Item: expect.objectContaining({
            limitKey: 'ip:192.168.1.1',
            requestCount: 1,
          }),
        })
      );
    });
  });

  describe('getRetryAfter', () => {
    test('calculates correct retry delay', () => {
      const now = Date.now();
      const windowStart = now - 30000; // 30 seconds ago
      const windowSeconds = 60;

      const retryAfter = service.getRetryAfter(windowStart, windowSeconds);

      // Should be approximately 30 seconds (rounded up)
      expect(retryAfter).toBeGreaterThanOrEqual(29);
      expect(retryAfter).toBeLessThanOrEqual(31);
    });

    test('returns positive value even at end of window', () => {
      const now = Date.now();
      const windowStart = now - 59500; // 59.5 seconds ago
      const windowSeconds = 60;

      const retryAfter = service.getRetryAfter(windowStart, windowSeconds);

      // Should be at least 1 second (rounded up from 0.5)
      expect(retryAfter).toBeGreaterThanOrEqual(1);
    });
  });

  describe('resetCounter', () => {
    test('deletes rate limit record', async () => {
      (dynamoDBClient.delete as jest.Mock).mockResolvedValue({});

      await service.resetCounter('ip:192.168.1.1', 60);

      expect(dynamoDBClient.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'RateLimits',
          Key: expect.objectContaining({
            limitKey: 'ip:192.168.1.1',
          }),
        })
      );
    });
  });

  describe('window calculation', () => {
    test('calculates correct window start for 1-minute window', () => {
      const timestamp = new Date('2024-01-01T12:34:56.789Z').getTime();
      const windowSeconds = 60;

      // Access private method via any cast for testing
      const windowStart = (service as any).getWindowStart(timestamp, windowSeconds);

      // Should round down to 12:34:00
      const expected = new Date('2024-01-01T12:34:00.000Z').getTime();
      expect(windowStart).toBe(expected);
    });

    test('calculates correct window start for 1-hour window', () => {
      const timestamp = new Date('2024-01-01T12:34:56.789Z').getTime();
      const windowSeconds = 3600;

      const windowStart = (service as any).getWindowStart(timestamp, windowSeconds);

      // Should round down to 12:00:00
      const expected = new Date('2024-01-01T12:00:00.000Z').getTime();
      expect(windowStart).toBe(expected);
    });
  });
});
