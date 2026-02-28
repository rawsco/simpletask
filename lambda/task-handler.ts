/**
 * Task Lambda Handler
 * 
 * Provides Lambda function handlers for all task management API endpoints:
 * - List tasks with pagination
 * - Create new tasks
 * - Update task status and description
 * - Delete tasks
 * - Reorder tasks
 * 
 * All handlers follow AWS Lambda handler patterns and integrate with:
 * - AuthenticationService for session validation
 * - TaskService for business logic
 * - AuditLogService for security event logging
 * 
 * Requirements: 14.1-14.4, 15.1-15.2, 16.1-16.2, 17.1-17.3, 19.1-19.2, 20.1-20.2
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { authenticationService } from './authentication-service';
import { taskService } from './task-service';
import { Task } from './types';

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
 * Helper function to extract session token from API Gateway event
 */
function extractSessionToken(event: APIGatewayProxyEvent): string | null {
  // Check Authorization header
  if (event.headers) {
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }
  return null;
}

/**
 * Handle list tasks request
 * 
 * GET /tasks
 * Query params: { limit?: number, lastKey?: string, showCompleted?: boolean }
 * 
 * Requirements: 16.1, 16.2, 20.1, 20.2
 */
export async function handleList(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract and validate session token
    const sessionToken = extractSessionToken(event);
    if (!sessionToken) {
      return createResponse(401, { error: 'Session token is required' });
    }

    // Validate session
    const session = await authenticationService.validateSession(sessionToken);
    if (!session) {
      return createResponse(401, { error: 'Invalid or expired session. Please login again.' });
    }

    // Parse query parameters
    const limit = event.queryStringParameters?.limit 
      ? parseInt(event.queryStringParameters.limit, 10) 
      : 50;
    const lastKey = event.queryStringParameters?.lastKey || undefined;
    const showCompleted = event.queryStringParameters?.showCompleted === 'true';

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return createResponse(400, { error: 'Limit must be between 1 and 100' });
    }

    // Call TaskService to list tasks
    const result = await taskService.listTasks(session.userId, {
      limit,
      lastKey,
      showCompleted,
    });

    // Return paginated task list
    return createResponse(200, {
      tasks: result.tasks,
      lastKey: result.lastKey,
      hasMore: result.hasMore,
    });

  } catch (error: any) {
    console.error('List tasks error:', error);
    return createResponse(500, { error: 'Failed to list tasks. Please try again.' });
  }
}

/**
 * Handle create task request
 * 
 * POST /tasks
 * Body: { description: string }
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export async function handleCreate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract and validate session token
    const sessionToken = extractSessionToken(event);
    if (!sessionToken) {
      return createResponse(401, { error: 'Session token is required' });
    }

    // Validate session
    const session = await authenticationService.validateSession(sessionToken);
    if (!session) {
      return createResponse(401, { error: 'Invalid or expired session. Please login again.' });
    }

    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { description } = JSON.parse(event.body);

    // Validate description
    if (!description || typeof description !== 'string') {
      return createResponse(400, { error: 'Task description is required' });
    }

    // Validate description is not empty or whitespace-only (Requirement 14.3)
    if (!taskService.validateTaskDescription(description)) {
      return createResponse(400, { error: 'Task description cannot be empty' });
    }

    // Create task with user ID from session (Requirements 14.1, 14.2, 14.4)
    const task = await taskService.createTask(session.userId, description);

    // Return created task
    return createResponse(201, { task });

  } catch (error: any) {
    console.error('Create task error:', error);
    return createResponse(500, { error: 'Failed to create task. Please try again.' });
  }
}

/**
 * Handle update task request
 * 
 * PUT /tasks/:taskId
 * Body: { completed?: boolean, description?: string }
 * 
 * Requirements: 15.1, 15.2
 */
export async function handleUpdate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract and validate session token
    const sessionToken = extractSessionToken(event);
    if (!sessionToken) {
      return createResponse(401, { error: 'Session token is required' });
    }

    // Validate session
    const session = await authenticationService.validateSession(sessionToken);
    if (!session) {
      return createResponse(401, { error: 'Invalid or expired session. Please login again.' });
    }

    // Parse task ID from path
    const taskId = event.pathParameters?.taskId;
    if (!taskId) {
      return createResponse(400, { error: 'Task ID is required' });
    }

    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const updates = JSON.parse(event.body);

    // Validate at least one update field is provided
    if (updates.completed === undefined && !updates.description) {
      return createResponse(400, { error: 'At least one field to update is required' });
    }

    // Validate description if provided
    if (updates.description !== undefined && !taskService.validateTaskDescription(updates.description)) {
      return createResponse(400, { error: 'Task description cannot be empty' });
    }

    // Verify task belongs to authenticated user
    const existingTask = await taskService.getTask(session.userId, taskId);
    if (!existingTask) {
      return createResponse(404, { error: 'Task not found' });
    }

    // Update task (Requirements 15.1, 15.2)
    const updatedTask = await taskService.updateTask(session.userId, taskId, updates);

    // Return updated task
    return createResponse(200, { task: updatedTask });

  } catch (error: any) {
    console.error('Update task error:', error);

    // Handle specific errors
    if (error.message === 'Task not found') {
      return createResponse(404, { error: 'Task not found' });
    }

    return createResponse(500, { error: 'Failed to update task. Please try again.' });
  }
}

/**
 * Handle delete task request
 * 
 * DELETE /tasks/:taskId
 * 
 * Requirements: 17.1, 17.3
 */
export async function handleDelete(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract and validate session token
    const sessionToken = extractSessionToken(event);
    if (!sessionToken) {
      return createResponse(401, { error: 'Session token is required' });
    }

    // Validate session
    const session = await authenticationService.validateSession(sessionToken);
    if (!session) {
      return createResponse(401, { error: 'Invalid or expired session. Please login again.' });
    }

    // Parse task ID from path
    const taskId = event.pathParameters?.taskId;
    if (!taskId) {
      return createResponse(400, { error: 'Task ID is required' });
    }

    // Verify task belongs to authenticated user
    const existingTask = await taskService.getTask(session.userId, taskId);
    if (!existingTask) {
      return createResponse(404, { error: 'Task not found' });
    }

    // Delete task (Requirements 17.1, 17.3)
    const success = await taskService.deleteTask(session.userId, taskId);

    if (!success) {
      return createResponse(500, { error: 'Failed to delete task' });
    }

    // Return success response
    return createResponse(200, { 
      success: true,
      message: 'Task deleted successfully',
    });

  } catch (error: any) {
    console.error('Delete task error:', error);

    // Handle specific errors
    if (error.message === 'Task not found') {
      return createResponse(404, { error: 'Task not found' });
    }

    return createResponse(500, { error: 'Failed to delete task. Please try again.' });
  }
}

/**
 * Handle reorder task request
 * 
 * PUT /tasks/reorder
 * Body: { taskId: string, newPosition: number }
 * 
 * Requirements: 19.1, 19.2
 */
export async function handleReorder(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    // Extract and validate session token
    const sessionToken = extractSessionToken(event);
    if (!sessionToken) {
      return createResponse(401, { error: 'Session token is required' });
    }

    // Validate session
    const session = await authenticationService.validateSession(sessionToken);
    if (!session) {
      return createResponse(401, { error: 'Invalid or expired session. Please login again.' });
    }

    // Parse request body
    if (!event.body) {
      return createResponse(400, { error: 'Request body is required' });
    }

    const { taskId, newPosition } = JSON.parse(event.body);

    // Validate required fields
    if (!taskId || newPosition === undefined) {
      return createResponse(400, { error: 'Task ID and new position are required' });
    }

    // Validate newPosition is a number
    if (typeof newPosition !== 'number' || newPosition < 0) {
      return createResponse(400, { error: 'New position must be a non-negative number' });
    }

    // Verify task belongs to authenticated user
    const existingTask = await taskService.getTask(session.userId, taskId);
    if (!existingTask) {
      return createResponse(404, { error: 'Task not found' });
    }

    // Reorder task (Requirements 19.1, 19.2)
    await taskService.reorderTask(session.userId, taskId, newPosition);

    // Return success response
    return createResponse(200, { 
      success: true,
      message: 'Task reordered successfully',
    });

  } catch (error: any) {
    console.error('Reorder task error:', error);

    // Handle specific errors
    if (error.message === 'Task not found') {
      return createResponse(404, { error: 'Task not found' });
    }

    if (error.message.includes('Invalid position')) {
      return createResponse(400, { error: error.message });
    }

    return createResponse(500, { error: 'Failed to reorder task. Please try again.' });
  }
}
