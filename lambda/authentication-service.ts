/**
 * Authentication Service
 * 
 * Provides authentication and authorization functionality including:
 * - User registration with CAPTCHA validation
 * - Email verification
 * - Login and session management
 * - Password reset
 * - Account lockout protection
 * 
 * Requirements: 1.x, 2.x, 3.x, 4.x, 7.x, 8.x, 9.x
 */

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { SES } from 'aws-sdk';
import { dynamoDBClient, TableNames } from './dynamodb-client';
import { encryptionService } from './encryption-service';
import { User, Session, PasswordValidationResult } from './types';

/**
 * Common passwords list (subset for demonstration)
 * In production, this should be a comprehensive list or use an external service
 */
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
  'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
  'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael',
]);

/**
 * Authentication Service class
 */
export class AuthenticationService {
  private ses: SES;
  private readonly saltRounds = 10;
  private readonly sessionInactivityTimeoutMs = 30 * 60 * 1000; // 30 minutes
  private readonly sessionMaxLifetimeMs = 24 * 60 * 60 * 1000; // 24 hours
  private readonly verificationCodeExpiryHours = 24;
  private readonly passwordResetCodeExpiryHours = 1;
  private readonly accountLockoutDurationMinutes = 15;
  private readonly maxFailedLoginAttempts = 5;
  private readonly failedLoginWindowMinutes = 15;

  constructor() {
    this.ses = new SES({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Validate email format using regex
   * Requirements: 1.5
   */
  validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    return emailRegex.test(email) && email.length <= 254;
  }

  /**
   * Validate password complexity
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      return {
        valid: false,
        errors: ['Password is required'],
      };
    }

    // Minimum length of 12 characters
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    // At least one uppercase letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // At least one lowercase letter
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // At least one numeric digit
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one numeric digit');
    }

    // At least one special character from the specified set
    if (!/[!@#$%^&*()\-+=\[\]{}|;:,.<>?]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*()-+=[]{}|;:,.<>?)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password is in the list of commonly compromised passwords
   * Requirements: 8.7
   */
  async checkPasswordCompromised(password: string): Promise<boolean> {
    if (!password) {
      return false;
    }

    // Check against common passwords list (case-insensitive)
    const lowerPassword = password.toLowerCase();
    return COMMON_PASSWORDS.has(lowerPassword);
  }

  /**
   * Hash password using bcrypt
   * Requirements: 1.6
   */
  async hashPassword(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    // Generate salt and hash password
    const hash = await bcrypt.hash(password, this.saltRounds);
    
    return hash;
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    return bcrypt.compare(password, hash);
  }
}

/**
 * Create and export a singleton instance
 */
export const authenticationService = new AuthenticationService();
