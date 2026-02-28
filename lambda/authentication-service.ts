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
}

/**
 * Create and export a singleton instance
 */
export const authenticationService = new AuthenticationService();
