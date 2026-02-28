/**
 * Task Service
 * 
 * Handles all task management operations including:
 * - CRUD operations (create, read, update, delete)
 * - Task reordering with drag-and-drop support
 * - Task filtering (hide completed tasks)
 * - Pagination for large task lists
 * 
 * All operations are scoped to the authenticated user's partition.
 */

import { v4 as uuidv4 } from 'uuid';
import { dynamoDBClient, TableNames } from './dynamodb-client';
import { Task, TaskPage, ListOptions } from './types';

/**
 * Updates for task modification
 */
export interface TaskUpdates {
  description?: string;
  completed?: boolean;
  order?: number;
}

/**
 * TaskService class providing all task management functionality
 */
export class TaskService {
  /**
   * Create a new task for the authenticated user
   * 
   * @param userId - The authenticated user's ID
   * @param description - The task description
   * @returns The created task
   * @throws Error if description is empty or whitespace-only
   * 
   * Requirements: 14.1, 14.2, 14.3, 14.4
   */
  async createTask(userId: string, description: string): Promise<Task> {
    // Validate task description is non-empty (Requirement 14.3)
    if (!this.validateTaskDescription(description)) {
      throw new Error('Task description cannot be empty');
    }

    const now = Date.now();
    const taskId = uuidv4();

    // Calculate order value for new task (append to end)
    const maxOrder = await this.getMaxOrder(userId);
    const order = maxOrder + 1;

    const task: Task = {
      userId,
      taskId,
      description: description.trim(),
      completed: false,
      order,
      createdAt: now,
      updatedAt: now,
    };

    // Persist task to database immediately (Requirement 14.4)
    await dynamoDBClient.put({
      TableName: TableNames.TASKS,
      Item: task,
    });

    return task;
  }

  /**
   * Get a single task by userId and taskId
   * 
   * @param userId - The authenticated user's ID
   * @param taskId - The task ID
   * @returns The task or null if not found
   * 
   * Requirements: 15.1, 16.1
   */
  async getTask(userId: string, taskId: string): Promise<Task | null> {
    const task = await dynamoDBClient.get<Task>({
      TableName: TableNames.TASKS,
      Key: {
        userId,
        taskId,
      },
    });

    return task;
  }

  /**
   * List tasks for a user with pagination support
   * 
   * @param userId - The authenticated user's ID
   * @param options - Pagination and filtering options
   * @returns Paginated task list
   * 
   * Requirements: 16.1, 16.2, 20.1, 20.2
   */
  async listTasks(userId: string, options: ListOptions): Promise<TaskPage> {
    const { limit, lastKey, showCompleted } = options;

    // Query using OrderIndex LSI to get tasks in user-defined order
    const queryParams: any = {
      TableName: TableNames.TASKS,
      IndexName: 'OrderIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      Limit: limit,
      ScanIndexForward: true, // Ascending order
    };

    // Add pagination token if provided
    if (lastKey) {
      queryParams.ExclusiveStartKey = JSON.parse(lastKey);
    }

    // Add filter for completed tasks if needed
    if (!showCompleted) {
      queryParams.FilterExpression = 'completed = :completed';
      queryParams.ExpressionAttributeValues[':completed'] = false;
    }

    const result = await dynamoDBClient.queryWithPagination<Task>(queryParams);

    return {
      tasks: result.items,
      lastKey: result.lastKey ? JSON.stringify(result.lastKey) : undefined,
      hasMore: !!result.lastKey,
    };
  }

  /**
   * Update a task's properties
   * 
   * @param userId - The authenticated user's ID
   * @param taskId - The task ID
   * @param updates - Properties to update
   * @returns The updated task
   * 
   * Requirements: 15.1, 15.2, 16.2
   */
  async updateTask(userId: string, taskId: string, updates: TaskUpdates): Promise<Task> {
    // Validate description if provided
    if (updates.description !== undefined && !this.validateTaskDescription(updates.description)) {
      throw new Error('Task description cannot be empty');
    }

    const now = Date.now();
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    // Build update expression dynamically
    if (updates.description !== undefined) {
      updateExpressions.push('#description = :description');
      expressionAttributeNames['#description'] = 'description';
      expressionAttributeValues[':description'] = updates.description.trim();
    }

    if (updates.completed !== undefined) {
      updateExpressions.push('#completed = :completed');
      expressionAttributeNames['#completed'] = 'completed';
      expressionAttributeValues[':completed'] = updates.completed;
    }

    if (updates.order !== undefined) {
      updateExpressions.push('#order = :order');
      expressionAttributeNames['#order'] = 'order';
      expressionAttributeValues[':order'] = updates.order;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    const updatedTask = await dynamoDBClient.update<Task>({
      TableName: TableNames.TASKS,
      Key: {
        userId,
        taskId,
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    if (!updatedTask) {
      throw new Error('Task not found');
    }

    return updatedTask;
  }

  /**
   * Delete a task from the database
   * 
   * @param userId - The authenticated user's ID
   * @param taskId - The task ID
   * @returns True if deleted successfully
   * 
   * Requirements: 17.1, 17.3
   */
  async deleteTask(userId: string, taskId: string): Promise<boolean> {
    await dynamoDBClient.delete({
      TableName: TableNames.TASKS,
      Key: {
        userId,
        taskId,
      },
    });

    return true;
  }

  /**
   * Validate task description is non-empty
   * 
   * @param description - The task description
   * @returns True if valid, false otherwise
   * 
   * Requirements: 14.3
   */
  validateTaskDescription(description: string): boolean {
    return !!description && description.trim().length > 0;
  }

  /**
   * Get the maximum order value for a user's tasks
   * Used when creating new tasks to append to the end
   * 
   * @param userId - The user's ID
   * @returns The maximum order value, or 0 if no tasks exist
   */
  private async getMaxOrder(userId: string): Promise<number> {
    const result = await dynamoDBClient.queryWithPagination<Task>({
      TableName: TableNames.TASKS,
      IndexName: 'OrderIndex',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Descending order to get max first
      Limit: 1,
    });

    if (result.items.length === 0) {
      return 0;
    }

    return result.items[0].order;
  }

  /**
   * Reorder a task to a new position
   * 
   * @param userId - The authenticated user's ID
   * @param taskId - The task ID to reorder
   * @param newPosition - The new position (0-indexed)
   * 
   * Requirements: 19.1, 19.2, 19.3
   */
  async reorderTask(userId: string, taskId: string, newPosition: number): Promise<void> {
    // Get all tasks for the user in current order
    const allTasks = await this.getAllTasksInOrder(userId);

    // Find the task to move
    const taskIndex = allTasks.findIndex(t => t.taskId === taskId);
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }

    // Validate new position
    if (newPosition < 0 || newPosition >= allTasks.length) {
      throw new Error('Invalid task position');
    }

    // If position hasn't changed, no need to update
    if (taskIndex === newPosition) {
      return;
    }

    // Calculate new order values for all affected tasks
    const updatedTasks = this.calculateBatchOrderUpdates(allTasks, taskId, newPosition);

    // Persist order changes immediately to database (Requirement 19.2, 19.3)
    await this.batchUpdateTaskOrders(userId, updatedTasks);
  }

  /**
   * Calculate the new order value for a task being moved
   * 
   * @param tasks - All tasks in current order
   * @param taskId - The task ID being moved
   * @param newPosition - The new position (0-indexed)
   * @returns The new order value
   * 
   * Requirements: 19.1, 19.2
   */
  calculateNewOrder(tasks: Task[], taskId: string, newPosition: number): number {
    // Remove the task from its current position
    const taskIndex = tasks.findIndex(t => t.taskId === taskId);
    const [task] = tasks.splice(taskIndex, 1);

    // Insert at new position
    tasks.splice(newPosition, 0, task);

    // Recalculate order values for all tasks
    // Using simple sequential numbering (1, 2, 3, ...)
    return newPosition + 1;
  }

  /**
   * Calculate batch order updates for all affected tasks
   * 
   * @param tasks - All tasks in current order
   * @param taskId - The task ID being moved
   * @param newPosition - The new position (0-indexed)
   * @returns Array of tasks with updated order values
   * 
   * Requirements: 19.1, 19.2
   */
  private calculateBatchOrderUpdates(
    tasks: Task[],
    taskId: string,
    newPosition: number
  ): Array<{ taskId: string; order: number }> {
    // Remove the task from its current position
    const taskIndex = tasks.findIndex(t => t.taskId === taskId);
    const [task] = tasks.splice(taskIndex, 1);

    // Insert at new position
    tasks.splice(newPosition, 0, task);

    // Recalculate order values for all tasks
    // Using simple sequential numbering (1, 2, 3, ...)
    return tasks.map((t, index) => ({
      taskId: t.taskId,
      order: index + 1,
    }));
  }

  /**
   * Batch update task orders in the database
   * 
   * @param userId - The user's ID
   * @param updates - Array of task order updates
   * 
   * Requirements: 19.2, 19.3
   */
  private async batchUpdateTaskOrders(
    userId: string,
    updates: Array<{ taskId: string; order: number }>
  ): Promise<void> {
    // DynamoDB batchWrite supports up to 25 items per request
    const BATCH_SIZE = 25;
    
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      
      // Use Promise.all to update tasks in parallel within the batch
      await Promise.all(
        batch.map(update =>
          this.updateTask(userId, update.taskId, { order: update.order })
        )
      );
    }
  }

  /**
   * Get all tasks for a user in order
   * 
   * @param userId - The user's ID
   * @returns All tasks sorted by order
   */
  private async getAllTasksInOrder(userId: string): Promise<Task[]> {
    const tasks: Task[] = [];
    let lastKey: any = undefined;

    do {
      const result = await dynamoDBClient.queryWithPagination<Task>({
        TableName: TableNames.TASKS,
        IndexName: 'OrderIndex',
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
        ScanIndexForward: true, // Ascending order
        ExclusiveStartKey: lastKey,
      });

      tasks.push(...result.items);
      lastKey = result.lastKey;
    } while (lastKey);

    return tasks;
  }

  /**
   * Filter out completed tasks from a task list
   * 
   * @param tasks - The task list
   * @returns Tasks with completed tasks removed
   * 
   * Requirements: 21.1, 21.2
   */
  filterCompletedTasks(tasks: Task[]): Task[] {
    return tasks.filter(task => !task.completed);
  }
}

/**
 * Export singleton instance
 */
export const taskService = new TaskService();
