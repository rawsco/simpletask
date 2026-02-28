/**
 * Main Auth Handler for SAM API Gateway Integration
 * Routes requests to appropriate handler functions based on path and method
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  handleRegister,
  handleVerify,
  handleLogin,
  handleLogout,
  handlePasswordResetRequest,
  handlePasswordReset,
  handleResendVerification
} from './auth-handler';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Auth Handler - Event:', JSON.stringify(event, null, 2));

  const path = event.path || event.resource;
  const method = event.httpMethod;

  try {
    // Route to appropriate handler based on path and method
    if (path.includes('/auth/register') && method === 'POST') {
      return await handleRegister(event);
    } else if (path.includes('/auth/verify') && method === 'POST') {
      return await handleVerify(event);
    } else if (path.includes('/auth/login') && method === 'POST') {
      return await handleLogin(event);
    } else if (path.includes('/auth/logout') && method === 'POST') {
      return await handleLogout(event);
    } else if (path.includes('/auth/password-reset-request') && method === 'POST') {
      return await handlePasswordResetRequest(event);
    } else if (path.includes('/auth/password-reset') && method === 'POST') {
      return await handlePasswordReset(event);
    } else if (path.includes('/auth/resend-verification') && method === 'POST') {
      return await handleResendVerification(event);
    } else {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: 'Not Found' })
      };
    }
  } catch (error) {
    console.error('Auth Handler Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
}
