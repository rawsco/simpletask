/**
 * Authentication Lambda Handler
 * 
 * Provides Lambda function handlers for all authentication-related API endpoints:
 * - User registration with CAPTCHA validation
 * - Email verification
 * - Login and logout
 * - Password reset request and reset
 * - Resend verification code
 * 
 * All handlers follow AWS Lambda handler patterns and integrate with:
 * - AuthenticationService for business logic
 * - AuditLogService for security event logging
 * - RateLimitService for request throttling
 * 
 * Requirements: 1.1-1.9, 2.1-2.7, 3.1-3.7, 4.1-4.4, 10.1-10.5
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticationService } from './authentication-service';
import type { User } from './types';
import { auditLogService } from './audit-log-service';

/**
 * Helper function to create API Gateway response
 */
function createResponse(
  statusCode: number,
  body: any,
  headers: Record<string, string> = {}
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // Configure with actual domain in production
      'Access-Control-Allow-Credentials': 'true',
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

/**
 * Helper function to extract IP address from API Gateway event
 */
function getIPAddress(event: APIGatewayProxyEvent): string {
  return event.requestContext?.identity?.sourceIp || 'unknown';
}

/**
 * Helper function to extract User-Agent from API Gateway event
 */
function getUserAgent(event: APIGatewayProxyEvent): string {
  return event.requestContext?.identity?.userAgent || 'unknown';
}

/**
 * Handle user registration
 * 
 * POST /auth/register
 * Body: { email: string, password: string, captchaToken: string }
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
 */
export async function handleRegister(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email, password, captchaToken } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !password || !captchaToken) {
      return createResponse(400, { error: 'Email, password, and CAPTCHA token are required' });
    }

    const ipAddress = getIPAddress(event);

    // Validate email format (Requirement 1.5)
    if (!authenticationService.validateEmail(email)) {
      await auditLogService.logLoginAttempt(email, ipAddress, false, { reason: 'invalid_email_format' });
      return createResponse(400, { error: 'Invalid email format' });
    }

    // Validate CAPTCHA (Requirement 1.1)
    const captchaValid = await authenticationService.validateCaptcha(captchaToken);
    if (!captchaValid) {
      await auditLogService.logLoginAttempt(email, ipAddress, false, { reason: 'invalid_captcha' });
      return createResponse(400, { error: 'Invalid CAPTCHA. Please try again.' });
    }

    // Validate password complexity (Requirement 1.6, 8.1-8.5)
    const passwordValidation = authenticationService.validatePassword(password);
    if (!passwordValidation.valid) {
      await auditLogService.logLoginAttempt(email, ipAddress, false, { reason: 'weak_password' });
      return createResponse(400, { 
        error: 'Password does not meet complexity requirements',
        details: passwordValidation.errors,
      });
    }

    // Check if password is compromised (Requirement 8.7)
    const isCompromised = await authenticationService.checkPasswordCompromised(password);
    if (isCompromised) {
      await auditLogService.logLoginAttempt(email, ipAddress, false, { reason: 'compromised_password' });
      return createResponse(400, { 
        error: 'This password has been compromised. Please choose a different password.',
      });
    }

    // Create user (Requirements 1.3, 1.4, 1.6, 1.7, 1.8)
    const user = await authenticationService.createUser(email, password);

    // Log successful registration
    await auditLogService.logLoginAttempt(email, ipAddress, true, { 
      userId: user.userId,
      action: 'registration',
    });

    return createResponse(201, {
      userId: user.userId,
      message: 'Registration successful. Please check your email for verification code.',
    });

  } catch (error: any) {
    console.error('Registration error:', error);

    // Handle specific errors
    if (error.message === 'Email already registered') {
      const ipAddress = getIPAddress(event);
      const body = event.body ? JSON.parse(event.body) : {};
      await auditLogService.logLoginAttempt(body.email || 'unknown', ipAddress, false, { 
        reason: 'email_already_exists',
      });
      return createResponse(409, { 
        error: 'Email already registered. Please login or reset password.',
      });
    }

    return createResponse(500, { error: 'Registration failed. Please try again.' });
  }
}

/**
 * Handle email verification
 * 
 * POST /auth/verify
 * Body: { email: string, code: string }
 * 
 * Requirements: 2.2, 2.3, 2.6
 */
export async function handleVerify(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email, code } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !code) {
      return createResponse(400, { error: 'Email and verification code are required' });
    }

    const ipAddress = getIPAddress(event);
    const userAgent = getUserAgent(event);

    // Verify code (Requirements 2.2, 2.3, 2.4)
    const verified = await authenticationService.verifyCode(email, code);

    if (!verified) {
      await auditLogService.logLoginAttempt(email, ipAddress, false, { 
        action: 'verification',
        reason: 'invalid_code',
      });
      return createResponse(400, { error: 'Invalid or expired verification code' });
    }

    // Get user from database to get userId
    const { dynamoDBClient, TableNames } = await import('./dynamodb-client');
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (!user) {
      return createResponse(404, { error: 'User not found' });
    }
    
    // Create session on successful verification (Requirement 2.6)
    const session = await authenticationService.createSession(user.userId, ipAddress, userAgent);

    // Log successful verification
    await auditLogService.logLoginAttempt(email, ipAddress, true, { 
      userId: user.userId,
      action: 'verification',
    });
    await auditLogService.logSessionEvent(user.userId, 'created', ipAddress);

    return createResponse(200, {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      message: 'Email verified successfully',
    });

  } catch (error: any) {
    console.error('Verification error:', error);

    const ipAddress = getIPAddress(event);
    const body = event.body ? JSON.parse(event.body) : {};

    // Handle specific errors
    if (error.message === 'User not found') {
      return createResponse(404, { error: 'User not found' });
    }

    if (error.message === 'No verification code found') {
      return createResponse(400, { error: 'No verification code found. Please request a new code.' });
    }

    if (error.message === 'Verification code expired') {
      await auditLogService.logLoginAttempt(body.email || 'unknown', ipAddress, false, { 
        action: 'verification',
        reason: 'code_expired',
      });
      return createResponse(400, { error: 'Verification code expired. Please request a new code.' });
    }

    if (error.message === 'Invalid verification code') {
      await auditLogService.logLoginAttempt(body.email || 'unknown', ipAddress, false, { 
        action: 'verification',
        reason: 'invalid_code',
      });
      return createResponse(400, { error: 'Invalid verification code' });
    }

    return createResponse(500, { error: 'Verification failed. Please try again.' });
  }
}

/**
 * Handle user login
 * 
 * POST /auth/login
 * Body: { email: string, password: string }
 * 
 * Requirements: 4.1, 4.2, 9.1, 9.4, 10.1
 */
export async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email, password } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !password) {
      return createResponse(400, { error: 'Email and password are required' });
    }

    const ipAddress = getIPAddress(event);
    const userAgent = getUserAgent(event);

    // Check if account is locked (Requirement 9.1, 9.2)
    const isLocked = await authenticationService.isAccountLocked(email);
    if (isLocked) {
      await auditLogService.logLoginAttempt(email, ipAddress, false, { reason: 'account_locked' });
      return createResponse(403, { 
        error: 'Account locked due to multiple failed login attempts. Please try again later or reset your password.',
      });
    }

    // Authenticate user (Requirement 4.1, 4.2)
    const user = await authenticationService.authenticateUser(email, password);

    // Create session on successful login
    const session = await authenticationService.createSession(user.userId, ipAddress, userAgent);

    // Log successful login (Requirement 10.1)
    await auditLogService.logLoginAttempt(email, ipAddress, true, { userId: user.userId });
    await auditLogService.logSessionEvent(user.userId, 'created', ipAddress);

    return createResponse(200, {
      sessionToken: session.sessionToken,
      expiresAt: session.expiresAt,
      userId: user.userId,
    });

  } catch (error: any) {
    console.error('Login error:', error);

    const ipAddress = getIPAddress(event);
    const body = event.body ? JSON.parse(event.body) : {};
    const email = body.email || 'unknown';

    // Log failed login attempt (Requirement 10.1)
    await auditLogService.logLoginAttempt(email, ipAddress, false, { 
      reason: error.message,
    });

    // Handle specific errors
    if (error.message === 'Invalid email or password') {
      return createResponse(401, { error: 'Invalid email or password' });
    }

    if (error.message === 'Please verify your email address before logging in') {
      return createResponse(403, { 
        error: 'Please verify your email address before logging in',
      });
    }

    if (error.message === 'Account locked due to multiple failed login attempts') {
      return createResponse(403, { 
        error: 'Account locked due to multiple failed login attempts. Please try again later or reset your password.',
      });
    }

    return createResponse(500, { error: 'Login failed. Please try again.' });
  }
}

/**
 * Handle user logout
 * 
 * POST /auth/logout
 * Body: { sessionToken: string }
 * 
 * Requirements: 4.4, 10.5
 */
export async function handleLogout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body or get from headers
    let sessionToken: string | undefined;

    if (event.body) {
      const body = JSON.parse(event.body);
      sessionToken = body.sessionToken;
    }

    // Also check Authorization header
    if (!sessionToken && event.headers) {
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      return createResponse(400, { error: 'Session token is required' });
    }

    const ipAddress = getIPAddress(event);

    // Validate session to get user ID before terminating
    const session = await authenticationService.validateSession(sessionToken);
    const userId = session?.userId;

    // Terminate session (Requirement 4.4)
    await authenticationService.terminateSession(sessionToken);

    // Log session termination (Requirement 10.5)
    if (userId) {
      await auditLogService.logSessionEvent(userId, 'terminated', ipAddress);
    }

    return createResponse(200, { 
      success: true,
      message: 'Logged out successfully',
    });

  } catch (error: any) {
    console.error('Logout error:', error);
    return createResponse(500, { error: 'Logout failed. Please try again.' });
  }
}

/**
 * Handle password reset request
 * 
 * POST /auth/password-reset-request
 * Body: { email: string }
 * 
 * Requirements: 3.1, 10.3
 */
export async function handlePasswordResetRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email } = JSON.parse(event.body);

    // Validate required fields
    if (!email) {
      return createResponse(400, { error: 'Email is required' });
    }

    const ipAddress = getIPAddress(event);

    // Validate email format
    if (!authenticationService.validateEmail(email)) {
      return createResponse(400, { error: 'Invalid email format' });
    }

    // Request password reset (Requirement 3.1)
    // Note: This method doesn't throw error if user doesn't exist (security best practice)
    await authenticationService.requestPasswordReset(email);

    // Log password reset request (Requirement 10.3)
    await auditLogService.logPasswordResetRequest(email, ipAddress);

    // Always return success to prevent email enumeration
    return createResponse(200, {
      message: 'If an account exists with this email, a password reset code has been sent.',
    });

  } catch (error: any) {
    console.error('Password reset request error:', error);
    return createResponse(500, { error: 'Password reset request failed. Please try again.' });
  }
}

/**
 * Handle password reset
 * 
 * POST /auth/password-reset
 * Body: { email: string, code: string, newPassword: string }
 * 
 * Requirements: 3.2, 3.5, 3.6, 10.2
 */
export async function handlePasswordReset(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email, code, newPassword } = JSON.parse(event.body);

    // Validate required fields
    if (!email || !code || !newPassword) {
      return createResponse(400, { error: 'Email, code, and new password are required' });
    }

    const ipAddress = getIPAddress(event);

    // Reset password (Requirements 3.2, 3.3, 3.4, 3.5)
    const success = await authenticationService.resetPassword(email, code, newPassword);

    if (!success) {
      return createResponse(400, { error: 'Password reset failed' });
    }

    // Get user from database to get userId for logging
    const { dynamoDBClient, TableNames } = await import('./dynamodb-client');
    const user = await dynamoDBClient.get<User>({
      TableName: TableNames.USERS,
      Key: { email },
    });

    if (user) {
      // Log password change (Requirement 10.2)
      await auditLogService.logPasswordChange(user.userId, ipAddress);
    }

    return createResponse(200, {
      success: true,
      message: 'Password reset successfully. Please login with your new password.',
    });

  } catch (error: any) {
    console.error('Password reset error:', error);

    const ipAddress = getIPAddress(event);
    const body = event.body ? JSON.parse(event.body) : {};

    // Handle specific errors
    if (error.message === 'User not found') {
      return createResponse(404, { error: 'User not found' });
    }

    if (error.message === 'No password reset code found') {
      return createResponse(400, { error: 'No password reset code found. Please request a new code.' });
    }

    if (error.message === 'Password reset code expired') {
      await auditLogService.logPasswordResetRequest(body.email || 'unknown', ipAddress, { 
        reason: 'code_expired',
      });
      return createResponse(400, { error: 'Password reset code expired. Please request a new code.' });
    }

    if (error.message === 'Invalid password reset code') {
      return createResponse(400, { error: 'Invalid password reset code' });
    }

    if (error.message.includes('Password does not meet') || error.message.includes('complexity')) {
      return createResponse(400, { error: error.message });
    }

    if (error.message.includes('compromised')) {
      return createResponse(400, { error: error.message });
    }

    return createResponse(500, { error: 'Password reset failed. Please try again.' });
  }
}

/**
 * Handle resend verification code
 * 
 * POST /auth/resend-verification
 * Body: { email: string }
 * 
 * Requirements: 2.7
 */
export async function handleResendVerification(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { email } = JSON.parse(event.body);

    // Validate required fields
    if (!email) {
      return createResponse(400, { error: 'Email is required' });
    }

    const ipAddress = getIPAddress(event);

    // Validate email format
    if (!authenticationService.validateEmail(email)) {
      return createResponse(400, { error: 'Invalid email format' });
    }

    // Resend verification code (Requirement 2.7)
    await authenticationService.resendVerificationCode(email);

    // Log the event
    await auditLogService.logLoginAttempt(email, ipAddress, true, { 
      action: 'resend_verification',
    });

    return createResponse(200, {
      message: 'Verification code sent. Please check your email.',
    });

  } catch (error: any) {
    console.error('Resend verification error:', error);

    // Handle specific errors
    if (error.message === 'User not found') {
      return createResponse(404, { error: 'User not found' });
    }

    if (error.message === 'Email already verified') {
      return createResponse(400, { error: 'Email already verified. Please login.' });
    }

    return createResponse(500, { error: 'Failed to resend verification code. Please try again.' });
  }
}
