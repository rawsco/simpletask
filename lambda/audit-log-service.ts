/**
 * Audit Log Service
 * 
 * Handles security event logging for compliance and forensic analysis.
 * All audit log entries are:
 * - Stored in DynamoDB AuditLog table
 * - Assigned unique event IDs
 * - Retained for 90 days via TTL
 * - Protected from modification or deletion by application users
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9
 */

import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TableNames } from './dynamodb-client';
import { AuditLogEntry, AuditEventType } from './types';

/**
 * Configuration constants
 */
const AUDIT_LOG_RETENTION_DAYS = 90;
const AUDIT_LOG_TTL_MS = AUDIT_LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000; // 90 days in milliseconds

/**
 * Audit Log Service class
 */
export class AuditLogService {
  /**
   * Log a login attempt
   * Requirements: 10.1
   * 
   * @param email - User's email address
   * @param ipAddress - IP address of the request
   * @param success - Whether the login was successful
   * @param metadata - Additional event-specific data
   */
  async logLoginAttempt(
    email: string,
    ipAddress: string,
    success: boolean,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const entry: AuditLogEntry = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      eventType: AuditEventType.LOGIN_ATTEMPT,
      email,
      ipAddress,
      success,
      metadata: {
        ...metadata,
        ttl: this.calculateTTL(),
      },
    };

    await this.writeAuditLog(entry);
  }

  /**
   * Log a password change event
   * Requirements: 10.2
   * 
   * @param userId - User identifier
   * @param ipAddress - IP address of the request
   * @param metadata - Additional event-specific data
   */
  async logPasswordChange(
    userId: string,
    ipAddress: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const entry: AuditLogEntry = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      eventType: AuditEventType.PASSWORD_CHANGE,
      userId,
      ipAddress,
      success: true,
      metadata: {
        ...metadata,
        ttl: this.calculateTTL(),
      },
    };

    await this.writeAuditLog(entry);
  }

  /**
   * Log a password reset request
   * Requirements: 10.3
   * 
   * @param email - User's email address
   * @param ipAddress - IP address of the request
   * @param metadata - Additional event-specific data
   */
  async logPasswordResetRequest(
    email: string,
    ipAddress: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const entry: AuditLogEntry = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      eventType: AuditEventType.PASSWORD_RESET_REQUEST,
      email,
      ipAddress,
      metadata: {
        ...metadata,
        ttl: this.calculateTTL(),
      },
    };

    await this.writeAuditLog(entry);
  }

  /**
   * Log an account lockout event
   * Requirements: 10.4
   * 
   * @param email - User's email address
   * @param reason - Reason for lockout
   * @param ipAddress - IP address of the request (optional)
   * @param metadata - Additional event-specific data
   */
  async logAccountLockout(
    email: string,
    reason: string,
    ipAddress: string = 'system',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const entry: AuditLogEntry = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      eventType: AuditEventType.ACCOUNT_LOCKOUT,
      email,
      ipAddress,
      metadata: {
        reason,
        ...metadata,
        ttl: this.calculateTTL(),
      },
    };

    await this.writeAuditLog(entry);
  }

  /**
   * Log a session event (creation or termination)
   * Requirements: 10.5
   * 
   * @param userId - User identifier
   * @param event - Event type: 'created' or 'terminated'
   * @param ipAddress - IP address of the request (optional)
   * @param metadata - Additional event-specific data
   */
  async logSessionEvent(
    userId: string,
    event: 'created' | 'terminated',
    ipAddress: string = 'unknown',
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const entry: AuditLogEntry = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      eventType: event === 'created' ? AuditEventType.SESSION_CREATED : AuditEventType.SESSION_TERMINATED,
      userId,
      ipAddress,
      metadata: {
        event,
        ...metadata,
        ttl: this.calculateTTL(),
      },
    };

    await this.writeAuditLog(entry);
  }

  /**
   * Log a rate limit violation event
   * Requirements: 10.6
   * 
   * @param ipAddress - IP address that exceeded the limit
   * @param requestCount - Number of requests made
   * @param metadata - Additional event-specific data
   */
  async logRateLimitEvent(
    ipAddress: string,
    requestCount: number,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const entry: AuditLogEntry = {
      eventId: uuidv4(),
      timestamp: Date.now(),
      eventType: AuditEventType.RATE_LIMIT_EXCEEDED,
      ipAddress,
      metadata: {
        requestCount,
        ...metadata,
        ttl: this.calculateTTL(),
      },
    };

    await this.writeAuditLog(entry);
  }

  /**
   * Write audit log entry to DynamoDB
   * Requirements: 10.7, 10.8, 10.9
   * 
   * @param entry - The audit log entry to write
   */
  private async writeAuditLog(entry: AuditLogEntry): Promise<void> {
    try {
      await dynamoDBClient.put({
        TableName: TableNames.AUDIT_LOG,
        Item: {
          ...entry,
          // Add TTL attribute for automatic cleanup after 90 days (Requirement 10.7)
          ttl: this.calculateTTL(),
        },
      });
    } catch (error: any) {
      // Log error but don't throw - audit logging should not break application flow
      console.error('Failed to write audit log entry:', error);
      console.error('Audit log entry:', JSON.stringify(entry));
    }
  }

  /**
   * Calculate TTL timestamp for audit log entry
   * Requirements: 10.7
   * 
   * @returns Unix timestamp (in seconds) for TTL expiration
   */
  private calculateTTL(): number {
    const now = Date.now();
    const expiryTimestamp = now + AUDIT_LOG_TTL_MS;
    
    // DynamoDB TTL expects seconds, not milliseconds
    return Math.floor(expiryTimestamp / 1000);
  }
}

/**
 * Create and export a singleton instance
 */
export const auditLogService = new AuditLogService();
