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
 * Requirements: 1.1-1.9, 2.1-2.7, 3.1-3.7, 4.1-4.4, 7.1-7.7, 8.1-8.7, 9.1-9.7
 */

import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { SES } from 'aws-sdk';
import { dynamoDBClient, TableNames } from './dynamodb-client';
import { encryptionService } from './encryption-service';
import { User, Session, PasswordValidationResult } from './types';

/**
 * Configuration constants
 */
const BCRYPT_SALT_ROUNDS = 12;
const VERIFICATION_CODE_EXPIRY_HOURS = 24;
const PASSWORD_RESET_CODE_EXPIRY_HOURS = 1;
const SESSION_INACTIVITY_TIMEOUT_MINUTES = 30;
const SESSION_MAX_LIFETIME_HOURS = 24;
const ACCOUNT_LOCKOUT_DURATION_MINUTES = 15;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const FAILED_LOGIN_WINDOW_MINUTES = 15;

/**
 * Common compromised passwords list (subset for demonstration)
 * In production, this should be a comprehensive list or use an external service
 */
const COMPROMISED_PASSWORDS = new Set([
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'monkey',
  '1234567',
  'letmein',
  'trustno1',
  'dragon',
  'baseball',
  'iloveyou',
  'master',
  'sunshine',
  'ashley',
  'bailey',
  'passw0rd',
  'shadow',
  '123123',
  '654321',
  'superman',
  'qazwsx',
  'michael',
  'football',
]);

/**
 * Email validation regex (RFC 5322 simplified)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Password complexity regex patterns
 */
const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  digit: /[0-9]/,
  special: /[!@#$%^&*()\-+=\[\]{}|;:,.<>?]/,
};

/**
 * Initialize SES client
 */
const ses = new SES({
  region: process.env.AWS_REGION || 'us-east-1',
});

/**
 * Authentication Service class
 */
export class AuthenticationService {
  /**
   * Validate email format
   * Requirements: 1.5
   */
  validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    return EMAIL_REGEX.test(email.trim());
  }

  /**
   * Validate password complexity
   * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      return { valid: false, errors: ['Password is required'] };
    }

    // Requirement 8.1: Minimum 12 characters
    if (password.length < 12) {
      errors.push('Password must be at least 12 characters long');
    }

    // Requirement 8.2: At least one uppercase letter
    if (!PASSWORD_PATTERNS.uppercase.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Requirement 8.3: At least one lowercase letter
    if (!PASSWORD_PATTERNS.lowercase.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Requirement 8.4: At least one digit
    if (!PASSWORD_PATTERNS.digit.test(password)) {
      errors.push('Password must contain at least one digit');
    }

    // Requirement 8.5: At least one special character
    if (!PASSWORD_PATTERNS.special.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*()-+=[]{}|;:,.<>?)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if password is in compromised password list
   * Requirements: 8.7
   */
  async checkPasswordCompromised(password: string): Promise<boolean> {
    // Check against common compromised passwords
    const lowerPassword = password.toLowerCase();
    return COMPROMISED_PASSWORDS.has(lowerPassword);
  }

  /**
   * Hash password using bcrypt
   * Requirements: 1.6
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate CAPTCHA token
   * Requirements: 1.1
   * 
   * Note: This is a placeholder implementation. In production, integrate with
   * a CAPTCHA service like Google reCAPTCHA or hCaptcha.
   */
  async validateCaptcha(token: string): Promise<boolean> {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // TODO: Implement actual CAPTCHA validation with external service
    // For now, accept any non-empty token for testing
    return token.length > 0;
  }

  /**
   * Create a new user account
   * Requirements: 1.3, 1.4, 1.6, 1.7, 1.8
   */
  async createUser(email: string, password: string): Promise<User> {
    // Check if email already exists
    const existingUser = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Encrypt password hash
    const encryptedPasswordHash = await encryptionService.encrypt(passwordHash);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const encryptedVerificationCode = await encryptionService.encrypt(verificationCode);

    // Create user object
    const now = Date.now();
    const user: User = {
      userId: uuidv4(),
      email,
      passwordHash: encryptedPasswordHash,
      verified: false,
      verificationCode: encryptedVerificationCode,
      verificationCodeExpiry: now + VERIFICATION_CODE_EXPIRY_HOURS * 60 * 60 * 1000,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Save user to database
    await dynamoDBClient.put({
      TableName: TableNames.USERS,
      Item: user,
    });

    // Send verification email
    await this.sendVerificationEmail(email, verificationCode);

    // Create exactly one task list for the user (Requirement 1.7)
    // This will be handled by the task service, but we ensure the user is created first

    return user;
  }

  /**
   * Generate a unique 6-digit verification code
   * Requirements: 2.1
   */
  generateVerificationCode(): string {
    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Send verification email using AWS SES
   * Requirements: 1.8, 2.1
   */
  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const params: SES.SendEmailRequest = {
      Source: process.env.SES_FROM_EMAIL || 'noreply@taskmanager.com',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Verify Your Email Address',
        },
        Body: {
          Text: {
            Data: `Welcome to Task Manager!\n\nYour verification code is: ${code}\n\nThis code will expire in ${VERIFICATION_CODE_EXPIRY_HOURS} hours.\n\nIf you did not create an account, please ignore this email.`,
          },
          Html: {
            Data: `
              <html>
                <body>
                  <h2>Welcome to Task Manager!</h2>
                  <p>Your verification code is:</p>
                  <h1 style="font-size: 32px; letter-spacing: 5px;">${code}</h1>
                  <p>This code will expire in ${VERIFICATION_CODE_EXPIRY_HOURS} hours.</p>
                  <p>If you did not create an account, please ignore this email.</p>
                </body>
              </html>
            `,
          },
        },
      },
    };

    try {
      await ses.sendEmail(params).promise();
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Verify email with verification code
   * Requirements: 2.2, 2.3, 2.4
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    // Get user
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.verified) {
      return true; // Already verified
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      throw new Error('No verification code found');
    }

    // Check if code is expired (Requirement 2.4)
    if (this.isCodeExpired(user.verificationCodeExpiry, VERIFICATION_CODE_EXPIRY_HOURS)) {
      throw new Error('Verification code expired');
    }

    // Decrypt and compare codes
    const storedCode = await encryptionService.decrypt(user.verificationCode);
    if (storedCode !== code) {
      throw new Error('Invalid verification code');
    }

    // Mark user as verified
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET verified = :verified, verificationCode = :null, verificationCodeExpiry = :null, updatedAt = :now',
      ExpressionAttributeValues: {
        ':verified': true,
        ':null': null,
        ':now': Date.now(),
      },
    });

    return true;
  }

  /**
   * Check if a code is expired
   * Requirements: 2.4, 3.4
   */
  isCodeExpired(expiryTimestamp: number, expiryHours: number): boolean {
    return Date.now() > expiryTimestamp;
  }

  /**
   * Resend verification code
   * Requirements: 2.7
   */
  async resendVerificationCode(email: string): Promise<void> {
    // Get user
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.verified) {
      throw new Error('Email already verified');
    }

    // Generate new verification code
    const verificationCode = this.generateVerificationCode();
    const encryptedVerificationCode = await encryptionService.encrypt(verificationCode);

    // Update user with new code
    const now = Date.now();
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET verificationCode = :code, verificationCodeExpiry = :expiry, updatedAt = :now',
      ExpressionAttributeValues: {
        ':code': encryptedVerificationCode,
        ':expiry': now + VERIFICATION_CODE_EXPIRY_HOURS * 60 * 60 * 1000,
        ':now': now,
      },
    });

    // Send new verification email
    await this.sendVerificationEmail(email, verificationCode);
  }

  /**
   * Authenticate user with email and password
   * Requirements: 4.1, 4.2
   */
  async authenticateUser(email: string, password: string): Promise<User> {
    // Get user
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (await this.isAccountLocked(email)) {
      throw new Error('Account locked due to multiple failed login attempts');
    }

    // Decrypt password hash
    const passwordHash = await encryptionService.decrypt(user.passwordHash);

    // Verify password
    const isValid = await this.verifyPassword(password, passwordHash);

    if (!isValid) {
      // Record failed login attempt
      await this.recordFailedLogin(email);
      throw new Error('Invalid email or password');
    }

    // Check if user is verified (Requirement 2.5)
    if (!user.verified) {
      throw new Error('Please verify your email address before logging in');
    }

    // Reset failed login attempts on successful login (Requirement 9.4)
    if (user.failedLoginAttempts > 0) {
      await dynamoDBClient.update({
        TableName: TableNames.USERS,
        Key: { email },
        UpdateExpression: 'SET failedLoginAttempts = :zero, lastFailedLoginAt = :null, updatedAt = :now',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':null': null,
          ':now': Date.now(),
        },
      });
    }

    return user;
  }

  /**
   * Create a new session for authenticated user
   * Requirements: 4.1, 7.1, 7.5, 7.7
   */
  async createSession(userId: string, ipAddress: string, userAgent: string): Promise<Session> {
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const token = jwt.sign(
      { userId },
      jwtSecret,
      { expiresIn: `${SESSION_MAX_LIFETIME_HOURS}h` }
    );

    // Encrypt session token
    const encryptedToken = await encryptionService.encrypt(token);

    const now = Date.now();
    const session: Session = {
      sessionToken: encryptedToken,
      userId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt: now + SESSION_MAX_LIFETIME_HOURS * 60 * 60 * 1000,
      ipAddress,
      userAgent,
    };

    // Save session to database
    await dynamoDBClient.put({
      TableName: TableNames.SESSIONS,
      Item: session,
    });

    return session;
  }

  /**
   * Validate session token and check expiry
   * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
   */
  async validateSession(encryptedToken: string): Promise<Session | null> {
    // Get session from database
    const session = await dynamoDBClient.get<Session>({
      TableName: TableNames.SESSIONS,
      Key: { sessionToken: encryptedToken },
    });

    if (!session) {
      return null;
    }

    const now = Date.now();

    // Check if session has expired (max lifetime - Requirement 7.5, 7.6)
    if (now > session.expiresAt) {
      await this.terminateSession(encryptedToken);
      return null;
    }

    // Check inactivity timeout (Requirement 7.1, 7.2)
    const inactivityTimeout = SESSION_INACTIVITY_TIMEOUT_MINUTES * 60 * 1000;
    if (now - session.lastActivityAt > inactivityTimeout) {
      await this.terminateSession(encryptedToken);
      return null;
    }

    // Update last activity time (Requirement 7.3)
    await dynamoDBClient.update({
      TableName: TableNames.SESSIONS,
      Key: { sessionToken: encryptedToken },
      UpdateExpression: 'SET lastActivityAt = :now',
      ExpressionAttributeValues: {
        ':now': now,
      },
    });

    return session;
  }

  /**
   * Terminate a session
   * Requirements: 4.4
   */
  async terminateSession(encryptedToken: string): Promise<void> {
    await dynamoDBClient.delete({
      TableName: TableNames.SESSIONS,
      Key: { sessionToken: encryptedToken },
    });
  }

  /**
   * Record a failed login attempt
   * Requirements: 9.1, 9.2, 9.6
   */
  async recordFailedLogin(email: string): Promise<void> {
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      return; // User doesn't exist, nothing to record
    }

    const now = Date.now();
    const windowStart = now - FAILED_LOGIN_WINDOW_MINUTES * 60 * 1000;

    // Check if last failed login was within the window
    let failedAttempts = user.failedLoginAttempts || 0;
    if (user.lastFailedLoginAt && user.lastFailedLoginAt > windowStart) {
      failedAttempts += 1;
    } else {
      // Reset counter if outside window
      failedAttempts = 1;
    }

    // Update failed login attempts
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET failedLoginAttempts = :attempts, lastFailedLoginAt = :now, updatedAt = :now',
      ExpressionAttributeValues: {
        ':attempts': failedAttempts,
        ':now': now,
      },
    });

    // Check if account should be locked (Requirement 9.1)
    if (failedAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.lockAccount(email, ACCOUNT_LOCKOUT_DURATION_MINUTES);
    }
  }

  /**
   * Check if account is locked
   * Requirements: 9.2
   */
  async isAccountLocked(email: string): Promise<boolean> {
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user || !user.lockedUntil) {
      return false;
    }

    const now = Date.now();
    
    // Check if lockout period has expired (Requirement 9.3)
    if (now > user.lockedUntil) {
      // Auto-unlock account
      await dynamoDBClient.update({
        TableName: TableNames.USERS,
        Key: { email },
        UpdateExpression: 'SET lockedUntil = :null, updatedAt = :now',
        ExpressionAttributeValues: {
          ':null': null,
          ':now': now,
        },
      });
      return false;
    }

    return true;
  }

  /**
   * Lock account for specified duration
   * Requirements: 9.1, 9.2, 9.6
   */
  async lockAccount(email: string, durationMinutes: number): Promise<void> {
    const now = Date.now();
    const lockedUntil = now + durationMinutes * 60 * 1000;

    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET lockedUntil = :lockedUntil, updatedAt = :now',
      ExpressionAttributeValues: {
        ':lockedUntil': lockedUntil,
        ':now': now,
      },
    });

    // Send lockout notification email (Requirement 9.6)
    await this.sendAccountLockoutEmail(email, durationMinutes);
  }

  /**
   * Unlock account (for password reset)
   * Requirements: 9.7
   */
  async unlockAccount(email: string): Promise<void> {
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET lockedUntil = :null, failedLoginAttempts = :zero, lastFailedLoginAt = :null, updatedAt = :now',
      ExpressionAttributeValues: {
        ':null': null,
        ':zero': 0,
        ':now': Date.now(),
      },
    });
  }

  /**
   * Send account lockout notification email
   * Requirements: 9.6
   */
  async sendAccountLockoutEmail(email: string, durationMinutes: number): Promise<void> {
    const params: SES.SendEmailRequest = {
      Source: process.env.SES_FROM_EMAIL || 'noreply@taskmanager.com',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Account Locked - Security Alert',
        },
        Body: {
          Text: {
            Data: `Your account has been temporarily locked due to multiple failed login attempts.\n\nThe account will be automatically unlocked in ${durationMinutes} minutes.\n\nIf you did not attempt to log in, please reset your password immediately.\n\nYou can also unlock your account immediately by completing the password reset process.`,
          },
          Html: {
            Data: `
              <html>
                <body>
                  <h2>Account Locked - Security Alert</h2>
                  <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
                  <p>The account will be automatically unlocked in <strong>${durationMinutes} minutes</strong>.</p>
                  <p>If you did not attempt to log in, please reset your password immediately.</p>
                  <p>You can also unlock your account immediately by completing the password reset process.</p>
                </body>
              </html>
            `,
          },
        },
      },
    };

    try {
      await ses.sendEmail(params).promise();
    } catch (error: any) {
      console.error('Failed to send lockout email:', error);
      // Don't throw error - lockout should still work even if email fails
    }
  }

  /**
   * Generate password reset code
   * Requirements: 3.1
   */
  generatePasswordResetCode(): string {
    // Generate random 8-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Send password reset email
   * Requirements: 3.1
   */
  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    const params: SES.SendEmailRequest = {
      Source: process.env.SES_FROM_EMAIL || 'noreply@taskmanager.com',
      Destination: {
        ToAddresses: [email],
      },
      Message: {
        Subject: {
          Data: 'Password Reset Request',
        },
        Body: {
          Text: {
            Data: `You have requested to reset your password.\n\nYour password reset code is: ${code}\n\nThis code will expire in ${PASSWORD_RESET_CODE_EXPIRY_HOURS} hour.\n\nIf you did not request a password reset, please ignore this email.`,
          },
          Html: {
            Data: `
              <html>
                <body>
                  <h2>Password Reset Request</h2>
                  <p>You have requested to reset your password.</p>
                  <p>Your password reset code is:</p>
                  <h1 style="font-size: 32px; letter-spacing: 5px;">${code}</h1>
                  <p>This code will expire in ${PASSWORD_RESET_CODE_EXPIRY_HOURS} hour.</p>
                  <p>If you did not request a password reset, please ignore this email.</p>
                </body>
              </html>
            `,
          },
        },
      },
    };

    try {
      await ses.sendEmail(params).promise();
    } catch (error: any) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Request password reset
   * Requirements: 3.1
   */
  async requestPasswordReset(email: string): Promise<void> {
    // Get user
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not for security
      return;
    }

    // Generate reset code
    const resetCode = this.generatePasswordResetCode();
    const encryptedResetCode = await encryptionService.encrypt(resetCode);

    // Update user with reset code
    const now = Date.now();
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET passwordResetCode = :code, passwordResetCodeExpiry = :expiry, updatedAt = :now',
      ExpressionAttributeValues: {
        ':code': encryptedResetCode,
        ':expiry': now + PASSWORD_RESET_CODE_EXPIRY_HOURS * 60 * 60 * 1000,
        ':now': now,
      },
    });

    // Send reset email
    await this.sendPasswordResetEmail(email, resetCode);
  }

  /**
   * Reset password with code
   * Requirements: 3.2, 3.3, 3.4, 3.5
   */
  async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    // Get user
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.passwordResetCode || !user.passwordResetCodeExpiry) {
      throw new Error('No password reset code found');
    }

    // Check if code is expired (Requirement 3.4)
    if (this.isCodeExpired(user.passwordResetCodeExpiry, PASSWORD_RESET_CODE_EXPIRY_HOURS)) {
      throw new Error('Password reset code expired');
    }

    // Decrypt and compare codes
    const storedCode = await encryptionService.decrypt(user.passwordResetCode);
    if (storedCode !== code) {
      throw new Error('Invalid password reset code');
    }

    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      throw new Error(validation.errors.join(', '));
    }

    // Check if password is compromised
    if (await this.checkPasswordCompromised(newPassword)) {
      throw new Error('This password has been compromised. Please choose a different password.');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(newPassword);
    const encryptedPasswordHash = await encryptionService.encrypt(passwordHash);

    // Update user with new password and clear reset code
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET passwordHash = :hash, passwordResetCode = :null, passwordResetCodeExpiry = :null, updatedAt = :now',
      ExpressionAttributeValues: {
        ':hash': encryptedPasswordHash,
        ':null': null,
        ':now': Date.now(),
      },
    });

    // Unlock account if locked (Requirement 9.7)
    await this.unlockAccount(email);

    // Invalidate all sessions for this user (Requirement 3.5)
    await this.invalidateAllSessions(user.userId);

    return true;
  }

  /**
   * Invalidate all sessions for a user
   * Requirements: 3.5
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    // Query all sessions for this user using GSI
    const sessions = await dynamoDBClient.query<Session>({
      TableName: TableNames.SESSIONS,
      IndexName: 'UserSessionsIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });

    // Delete all sessions
    if (sessions.length > 0) {
      const deletePromises = sessions.map(session =>
        dynamoDBClient.delete({
          TableName: TableNames.SESSIONS,
          Key: { sessionToken: session.sessionToken },
        })
      );
      await Promise.all(deletePromises);
    }
  }
}

/**
 * Create and export a singleton instance
 */
export const authenticationService = new AuthenticationService();
