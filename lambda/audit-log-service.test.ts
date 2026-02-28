/**
 * Unit tests for Audit Log Service
 * 
 * Tests the audit logging functionality including:
 * - Login attempt logging
 * - Password change logging
 * - Password reset request logging
 * - Account lockout logging
 * - Session event logging
 * - Rate limit event logging
 * - Unique event ID generation
 * - TTL calculation
 */

import { auditLogService, AuditLogService } from './audit-log-service';
import { dynamoDBClient } from './dynamodb-client';
import { AuditEventType } from './types';

// Mock the DynamoDB client
jest.mock('./dynamodb-client', () => ({
  dynamoDBClient: {
    put: jest.fn(),
  },
  TableNames: {
    AUDIT_LOG: 'AuditLog',
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockPut: jest.Mock;

  beforeEach(() => {
    service = new AuditLogService();
    mockPut = dynamoDBClient.put as jest.Mock;
    mockPut.mockClear();
    mockPut.mockResolvedValue(undefined);
    
    // Mock Date.now() for consistent timestamps
    jest.spyOn(Date, 'now').mockReturnValue(1000000000000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logLoginAttempt', () => {
    it('should log successful login attempt', async () => {
      await service.logLoginAttempt('user@example.com', '192.168.1.1', true);

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventId: 'test-uuid-1234',
          timestamp: 1000000000000,
          eventType: AuditEventType.LOGIN_ATTEMPT,
          email: 'user@example.com',
          ipAddress: '192.168.1.1',
          success: true,
          metadata: expect.objectContaining({
            ttl: expect.any(Number),
          }),
          ttl: expect.any(Number),
        }),
      });
    });

    it('should log failed login attempt', async () => {
      await service.logLoginAttempt('user@example.com', '192.168.1.1', false, { reason: 'invalid password' });

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventType: AuditEventType.LOGIN_ATTEMPT,
          email: 'user@example.com',
          success: false,
          metadata: expect.objectContaining({
            reason: 'invalid password',
          }),
        }),
      });
    });
  });

  describe('logPasswordChange', () => {
    it('should log password change event', async () => {
      await service.logPasswordChange('user-123', '192.168.1.1');

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventId: 'test-uuid-1234',
          timestamp: 1000000000000,
          eventType: AuditEventType.PASSWORD_CHANGE,
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          success: true,
          metadata: expect.objectContaining({
            ttl: expect.any(Number),
          }),
          ttl: expect.any(Number),
        }),
      });
    });

    it('should include additional metadata', async () => {
      await service.logPasswordChange('user-123', '192.168.1.1', { method: 'reset' });

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          metadata: expect.objectContaining({
            method: 'reset',
          }),
        }),
      });
    });
  });

  describe('logPasswordResetRequest', () => {
    it('should log password reset request', async () => {
      await service.logPasswordResetRequest('user@example.com', '192.168.1.1');

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventId: 'test-uuid-1234',
          timestamp: 1000000000000,
          eventType: AuditEventType.PASSWORD_RESET_REQUEST,
          email: 'user@example.com',
          ipAddress: '192.168.1.1',
          metadata: expect.objectContaining({
            ttl: expect.any(Number),
          }),
          ttl: expect.any(Number),
        }),
      });
    });
  });

  describe('logAccountLockout', () => {
    it('should log account lockout event', async () => {
      await service.logAccountLockout('user@example.com', 'Multiple failed login attempts', '192.168.1.1');

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventId: 'test-uuid-1234',
          timestamp: 1000000000000,
          eventType: AuditEventType.ACCOUNT_LOCKOUT,
          email: 'user@example.com',
          ipAddress: '192.168.1.1',
          metadata: expect.objectContaining({
            reason: 'Multiple failed login attempts',
            ttl: expect.any(Number),
          }),
          ttl: expect.any(Number),
        }),
      });
    });

    it('should use default IP address when not provided', async () => {
      await service.logAccountLockout('user@example.com', 'Test reason');

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          ipAddress: 'system',
        }),
      });
    });
  });

  describe('logSessionEvent', () => {
    it('should log session created event', async () => {
      await service.logSessionEvent('user-123', 'created', '192.168.1.1');

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventId: 'test-uuid-1234',
          timestamp: 1000000000000,
          eventType: AuditEventType.SESSION_CREATED,
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          metadata: expect.objectContaining({
            event: 'created',
            ttl: expect.any(Number),
          }),
          ttl: expect.any(Number),
        }),
      });
    });

    it('should log session terminated event', async () => {
      await service.logSessionEvent('user-123', 'terminated', '192.168.1.1');

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventType: AuditEventType.SESSION_TERMINATED,
          metadata: expect.objectContaining({
            event: 'terminated',
          }),
        }),
      });
    });

    it('should use default IP address when not provided', async () => {
      await service.logSessionEvent('user-123', 'created');

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          ipAddress: 'unknown',
        }),
      });
    });
  });

  describe('logRateLimitEvent', () => {
    it('should log rate limit exceeded event', async () => {
      await service.logRateLimitEvent('192.168.1.1', 150);

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          eventId: 'test-uuid-1234',
          timestamp: 1000000000000,
          eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
          ipAddress: '192.168.1.1',
          metadata: expect.objectContaining({
            requestCount: 150,
            ttl: expect.any(Number),
          }),
          ttl: expect.any(Number),
        }),
      });
    });

    it('should include additional metadata', async () => {
      await service.logRateLimitEvent('192.168.1.1', 150, { endpoint: '/api/tasks' });

      expect(mockPut).toHaveBeenCalledWith({
        TableName: 'AuditLog',
        Item: expect.objectContaining({
          metadata: expect.objectContaining({
            requestCount: 150,
            endpoint: '/api/tasks',
          }),
        }),
      });
    });
  });

  describe('TTL calculation', () => {
    it('should calculate TTL as 90 days from now in seconds', async () => {
      await service.logLoginAttempt('user@example.com', '192.168.1.1', true);

      const call = mockPut.mock.calls[0][0];
      const ttl = call.Item.ttl;

      // TTL should be 90 days (7776000000 ms) from now, converted to seconds
      const expectedTTL = Math.floor((1000000000000 + 90 * 24 * 60 * 60 * 1000) / 1000);
      expect(ttl).toBe(expectedTTL);
    });
  });

  describe('Unique event IDs', () => {
    it('should generate unique event IDs for each log entry', async () => {
      const { v4: uuidv4 } = require('uuid');
      (uuidv4 as jest.Mock)
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2')
        .mockReturnValueOnce('uuid-3');

      await service.logLoginAttempt('user1@example.com', '192.168.1.1', true);
      await service.logPasswordChange('user-123', '192.168.1.1');
      await service.logSessionEvent('user-456', 'created', '192.168.1.1');

      expect(mockPut).toHaveBeenCalledTimes(3);
      expect(mockPut.mock.calls[0][0].Item.eventId).toBe('uuid-1');
      expect(mockPut.mock.calls[1][0].Item.eventId).toBe('uuid-2');
      expect(mockPut.mock.calls[2][0].Item.eventId).toBe('uuid-3');
    });
  });

  describe('Error handling', () => {
    it('should not throw error when DynamoDB put fails', async () => {
      mockPut.mockRejectedValueOnce(new Error('DynamoDB error'));
      
      // Mock console.error to suppress error output in tests
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(
        service.logLoginAttempt('user@example.com', '192.168.1.1', true)
      ).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to write audit log entry:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
