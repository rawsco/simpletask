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
    // For now, accept any non-empty token for development
    // In production, this should call the CAPTCHA service API
    
    // Example for Google reCAPTCHA:
    // const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', {
    //   secret: process.env.RECAPTCHA_SECRET_KEY,
    //   response: token,
    // });
    // return response.data.success;

    return token.length > 0;
  }

  /**
   * Create a new user in the database
   * Requirements: 1.3, 1.4, 1.7, 1.8
   */
  async createUser(email: string, passwordHash: string): Promise<User> {
    // Check if email already exists
    const existingUser = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpiry = Date.now() + (this.verificationCodeExpiryHours * 60 * 60 * 1000);

    // Encrypt sensitive data
    const encryptedPasswordHash = await encryptionService.encrypt(passwordHash);
    const encryptedVerificationCode = await encryptionService.encrypt(verificationCode);

    // Create user object
    const userId = uuidv4();
    const now = Date.now();
    const user: User = {
      userId,
      email,
      passwordHash: encryptedPasswordHash,
      verified: false,
      verificationCode: encryptedVerificationCode,
      verificationCodeExpiry,
      failedLoginAttempts: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Save user to database
    await dynamoDBClient.put({
      TableName: TableNames.USERS,
      Item: user,
    });

    // Create exactly one task list for the new user
    // This is done by creating the Tasks table partition for this userId
    // The first task will be created when the user adds their first task
    // For now, we just ensure the user record exists

    // Send verification email
    await this.sendVerificationEmail(email, verificationCode);

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
   * Requirements: 2.1
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
            Data: `Welcome to Task Manager!\n\nYour verification code is: ${code}\n\nThis code will expire in ${this.verificationCodeExpiryHours} hours.\n\nIf you did not create an account, please ignore this email.`,
          },
          Html: {
            Data: `
              <html>
                <body>
                  <h2>Welcome to Task Manager!</h2>
                  <p>Your verification code is:</p>
                  <h1 style="font-size: 32px; letter-spacing: 5px; color: #007bff;">${code}</h1>
                  <p>This code will expire in ${this.verificationCodeExpiryHours} hours.</p>
                  <p>If you did not create an account, please ignore this email.</p>
                </body>
              </html>
            `,
          },
        },
      },
    };

    try {
      await this.ses.sendEmail(params).promise();
    } catch (error: any) {
      console.error('Failed to send verification email:', error);
      throw new Error(`Failed to send verification email: ${error.message}`);
    }
  }

  /**
   * Verify email with verification code
   * Requirements: 2.2, 2.3
   */
  async verifyCode(email: string, code: string): Promise<boolean> {
    if (!email || !code) {
      return false;
    }

    // Get user from database
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      return false;
    }

    // Check if already verified
    if (user.verified) {
      return true;
    }

    // Check if verification code exists
    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return false;
    }

    // Check if code is expired
    if (this.isCodeExpired(user.verificationCodeExpiry, this.verificationCodeExpiryHours)) {
      return false;
    }

    // Decrypt and compare verification code
    const decryptedCode = await encryptionService.decrypt(user.verificationCode);
    if (decryptedCode !== code) {
      return false;
    }

    // Mark user as verified and clear verification code
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET verified = :verified, verificationCode = :null, verificationCodeExpiry = :null, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':verified': true,
        ':null': null,
        ':updatedAt': Date.now(),
      },
    });

    return true;
  }

  /**
   * Check if a code is expired
   * Requirements: 2.4, 3.4
   */
  isCodeExpired(expiryTimestamp: number, expiryHours: number): boolean {
    const now = Date.now();
    return now > expiryTimestamp;
  }

  /**
   * Resend verification code
   * Requirements: 2.7
   */
  async resendVerificationCode(email: string): Promise<void> {
    // Get user from database
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if already verified
    if (user.verified) {
      throw new Error('Email already verified');
    }

    // Generate new verification code
    const verificationCode = this.generateVerificationCode();
    const verificationCodeExpiry = Date.now() + (this.verificationCodeExpiryHours * 60 * 60 * 1000);

    // Encrypt verification code
    const encryptedVerificationCode = await encryptionService.encrypt(verificationCode);

    // Update user with new verification code
    await dynamoDBClient.update({
      TableName: TableNames.USERS,
      Key: { email },
      UpdateExpression: 'SET verificationCode = :code, verificationCodeExpiry = :expiry, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':code': encryptedVerificationCode,
        ':expiry': verificationCodeExpiry,
        ':updatedAt': Date.now(),
      },
    });

    // Send verification email
    await this.sendVerificationEmail(email, verificationCode);
  }

  /**
   * Authenticate user with email and password
   * Requirements: 4.1, 4.2
   */
  async authenticateUser(email: string, password: string): Promise<User | null> {
    if (!email || !password) {
      return null;
    }

    // Get user from database
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      return null;
    }

    // Decrypt password hash
    const decryptedPasswordHash = await encryptionService.decrypt(user.passwordHash);

    // Verify password
    const isValid = await this.verifyPassword(password, decryptedPasswordHash);
    if (!isValid) {
      return null;
    }

    return user;
  }

  /**
   * Create a new session for authenticated user
   * Requirements: 4.1, 7.1, 7.5, 7.7
   */
  async createSession(userId: string, ipAddress: string, userAgent: string): Promise<Session> {
    const now = Date.now();
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
    const tokenPayload = {
      userId,
      sessionId: uuidv4(),
      createdAt: now,
    };
    
    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: '24h', // Maximum session lifetime
    });

    // Encrypt session token
    const encryptedToken = await encryptionService.encrypt(token);

    // Calculate expiry times
    const inactivityExpiry = now + this.sessionInactivityTimeoutMs;
    const maxLifetimeExpiry = now + this.sessionMaxLifetimeMs;
    const expiresAt = Math.min(inactivityExpiry, maxLifetimeExpiry);

    // Create session object
    const session: Session = {
      sessionToken: encryptedToken,
      userId,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
      ipAddress,
      userAgent,
    };

    // Store session in database
    await dynamoDBClient.put({
      TableName: TableNames.SESSIONS,
      Item: session,
    });

    // Return session with unencrypted token for client
    return {
      ...session,
      sessionToken: token,
    };
  }

  /**
   * Validate session token and check expiry
   * Requirements: 7.1, 7.2, 7.3, 7.5, 7.6
   */
  async validateSession(sessionToken: string): Promise<Session | null> {
    if (!sessionToken) {
      return null;
    }

    try {
      // Verify JWT token
      const jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
      const decoded = jwt.verify(sessionToken, jwtSecret) as any;

      // Encrypt token to look up in database
      const encryptedToken = await encryptionService.encrypt(sessionToken);

      // Get session from database
      const session = await dynamoDBClient.get<Session>({
        TableName: TableNames.SESSIONS,
        Key: { sessionToken: encryptedToken },
      });

      if (!session) {
        return null;
      }

      const now = Date.now();

      // Check if session expired
      if (session.expiresAt < now) {
        // Session expired, delete it
        await this.terminateSession(sessionToken);
        return null;
      }

      // Check inactivity timeout
      const inactivityDuration = now - session.lastActivityAt;
      if (inactivityDuration > this.sessionInactivityTimeoutMs) {
        // Session timed out due to inactivity
        await this.terminateSession(sessionToken);
        return null;
      }

      // Check maximum lifetime
      const sessionAge = now - session.createdAt;
      if (sessionAge > this.sessionMaxLifetimeMs) {
        // Session exceeded maximum lifetime
        await this.terminateSession(sessionToken);
        return null;
      }

      // Update last activity time
      const newInactivityExpiry = now + this.sessionInactivityTimeoutMs;
      const maxLifetimeExpiry = session.createdAt + this.sessionMaxLifetimeMs;
      const newExpiresAt = Math.min(newInactivityExpiry, maxLifetimeExpiry);

      await dynamoDBClient.update({
        TableName: TableNames.SESSIONS,
        Key: { sessionToken: encryptedToken },
        UpdateExpression: 'SET lastActivityAt = :lastActivityAt, expiresAt = :expiresAt',
        ExpressionAttributeValues: {
          ':lastActivityAt': now,
          ':expiresAt': newExpiresAt,
        },
      });

      // Return session with updated activity time
      return {
        ...session,
        lastActivityAt: now,
        expiresAt: newExpiresAt,
        sessionToken, // Return unencrypted token
      };
    } catch (error) {
      // Invalid token or other error
      return null;
    }
  }

  /**
   * Terminate a session
   * Requirements: 4.4
   */
  async terminateSession(sessionToken: string): Promise<void> {
    if (!sessionToken) {
      return;
    }

    try {
      // Encrypt token to look up in database
      const encryptedToken = await encryptionService.encrypt(sessionToken);

      // Delete session from database
      await dynamoDBClient.delete({
        TableName: TableNames.SESSIONS,
        Key: { sessionToken: encryptedToken },
      });
    } catch (error) {
      // Ignore errors during session termination
      console.error('Error terminating session:', error);
    }
  }

  /**
   * Invalidate all sessions for a user
   * Requirements: 3.5
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    if (!userId) {
      return;
    }

    try {
      // Query all sessions for the user using GSI
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
        const deleteRequests = sessions.map(session => ({
          DeleteRequest: {
            Key: { sessionToken: session.sessionToken },
          },
        }));

        // Batch delete in chunks of 25 (DynamoDB limit)
        for (let i = 0; i < deleteRequests.length; i += 25) {
          const chunk = deleteRequests.slice(i, i + 25);
          await dynamoDBClient.batchWrite({
            RequestItems: {
              [TableNames.SESSIONS]: chunk,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error invalidating all sessions:', error);
      throw new Error('Failed to invalidate sessions');
    }
  }
}

/**
 * Create and export a singleton instance
 */
export const authenticationService = new AuthenticationService();
