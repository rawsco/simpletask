/**
 * Main entry point for Auth Lambda Function
 * Routes API Gateway requests to appropriate handlers
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  handleRegister,
  handleVerify,
  handleLogin,
  handleLogout,
  handlePasswordResetRequest,
  handlePasswordReset,
  handleResendVerification,
} from './auth-handler';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const path = event.path;
  const method = event.httpMethod;

  console.log(`Auth Handler: ${method} ${path}`);

  try {
    // Route to appropriate handler based on path
    if (path.endsWith('/auth/register') && method === 'POST') {
      return await handleRegister(event);
    } else if (path.endsWith('/auth/verify') && method === 'POST') {
      return await handleVerify(event);
    } else if (path.endsWith('/auth/login') && method === 'POST') {
      return await handleLogin(event);
    } else if (path.endsWith('/auth/logout') && method === 'POST') {
      return await handleLogout(event);
    } else if (path.endsWith('/auth/reset-password-request') && method === 'POST') {
      return await handlePasswordResetRequest(event);
    } else if (path.endsWith('/auth/reset-password') && method === 'POST') {
      return await handlePasswordReset(event);
    } else if (path.endsWith('/auth/resend-verification') && method === 'POST') {
      return await handleResendVerification(event);
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Not found' }),
      };
    }
  } catch (error) {
    console.error('Auth handler error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}
