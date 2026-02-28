/**
 * Main entry point for Task Lambda Function
 * Routes API Gateway requests to appropriate handlers
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  handleList,
  handleCreate,
  handleUpdate,
  handleDelete,
  handleReorder,
} from './task-handler';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const path = event.path;
  const method = event.httpMethod;

  console.log(`Task Handler: ${method} ${path}`);

  try {
    // Route to appropriate handler based on path and method
    if (path.endsWith('/tasks') && method === 'GET') {
      return await handleList(event);
    } else if (path.endsWith('/tasks') && method === 'POST') {
      return await handleCreate(event);
    } else if (path.match(/\/tasks\/[^/]+$/) && method === 'PUT') {
      return await handleUpdate(event);
    } else if (path.match(/\/tasks\/[^/]+$/) && method === 'DELETE') {
      return await handleDelete(event);
    } else if (path.endsWith('/tasks/reorder') && method === 'POST') {
      return await handleReorder(event);
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
    console.error('Task handler error:', error);
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
