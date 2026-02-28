/**
 * Main Task Handler for SAM API Gateway Integration
 * Routes requests to appropriate handler functions based on path and method
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  handleList,
  handleCreate,
  handleUpdate,
  handleDelete,
  handleReorder
} from './task-handler';

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  console.log('Task Handler - Event:', JSON.stringify(event, null, 2));

  const path = event.path || event.resource;
  const method = event.httpMethod;

  try {
    // Route to appropriate handler based on path and method
    if (path === '/tasks' && method === 'GET') {
      return await handleList(event);
    } else if (path === '/tasks' && method === 'POST') {
      return await handleCreate(event);
    } else if (path.match(/\/tasks\/[^/]+$/) && method === 'PUT') {
      return await handleUpdate(event);
    } else if (path.match(/\/tasks\/[^/]+$/) && method === 'DELETE') {
      return await handleDelete(event);
    } else if (path.match(/\/tasks\/[^/]+\/reorder$/) && method === 'POST') {
      return await handleReorder(event);
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
    console.error('Task Handler Error:', error);
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
