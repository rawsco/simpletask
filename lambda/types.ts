/**
 * Core TypeScript type definitions for the Task Manager Application
 * 
 * This file defines all data models and types used throughout the application,
 * matching the DynamoDB table structures and business logic requirements.
 */

/**
 * User entity stored in the Users table
 * Partition Key: email
 * GSI: UserIdIndex on userId
 */
export interface User {
  userId: string;
  email: string;
  passwordHash: string; // Encrypted with AES-256
  verified: boolean;
  verificationCode?: string; // Encrypted with AES-256
  verificationCodeExpiry?: number; // Unix timestamp
  passwordResetCode?: string; // Encrypted with AES-256
  passwordResetCodeExpiry?: number; // Unix timestamp
  failedLoginAttempts: number;
  lastFailedLoginAt?: number; // Unix timestamp
  lockedUntil?: number; // Unix timestamp
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

/**
 * Task entity stored in the Tasks table
 * Partition Key: userId
 * Sort Key: taskId
 * LSI: OrderIndex on order
 */
export interface Task {
  userId: string;
  taskId: string;
  description: string;
  completed: boolean;
  order: number; // For user-defined ordering
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

/**
 * Session entity stored in the Sessions table
 * Partition Key: sessionToken (encrypted)
 * GSI: UserSessionsIndex on userId + createdAt
 * TTL: expiresAt
 */
export interface Session {
  sessionToken: string; // Encrypted with AES-256
  userId: string;
  createdAt: number; // Unix timestamp
  lastActivityAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (TTL field)
  ipAddress: string;
  userAgent: string;
}

/**
 * Audit event types for security logging
 */
export enum AuditEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  PASSWORD_CHANGE = 'password_change',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  ACCOUNT_LOCKOUT = 'account_lockout',
  SESSION_CREATED = 'session_created',
  SESSION_TERMINATED = 'session_terminated',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
}

/**
 * Audit log entry stored in the AuditLog table
 * Partition Key: eventId
 * Sort Key: timestamp
 * GSI: UserEventsIndex on userId + timestamp
 * GSI: EventTypeIndex on eventType + timestamp
 * TTL: Set to timestamp + 90 days
 */
export interface AuditLogEntry {
  eventId: string;
  timestamp: number; // Unix timestamp
  eventType: AuditEventType;
  userId?: string;
  email?: string;
  ipAddress: string;
  success?: boolean;
  metadata: Record<string, any>; // Additional event-specific data
}

/**
 * Rate limit entry stored in the RateLimits table
 * Partition Key: limitKey (format: "ip:{address}" or "user:{userId}")
 * Sort Key: windowStart
 * TTL: expiresAt
 */
export interface RateLimit {
  limitKey: string;
  windowStart: number; // Unix timestamp
  requestCount: number;
  expiresAt: number; // Unix timestamp (TTL field)
}

/**
 * Result of password validation
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Result of rate limit check
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number; // Seconds until requests will be accepted again
}

/**
 * Options for listing tasks with pagination
 */
export interface ListOptions {
  limit: number;
  lastKey?: string; // Pagination token
  showCompleted: boolean;
}

/**
 * Paginated task list response
 */
export interface TaskPage {
  tasks: Task[];
  lastKey?: string; // Pagination token for next page
  hasMore: boolean;
}
