/**
 * Unit tests for TaskService
 * 
 * Tests CRUD operations, validation, reordering, and filtering functionality.
 */

import { TaskService } from './task-service';
import { dynamoDBClient } from './dynamodb-client';
import { Task } from './types';

// Mock the DynamoDB client
jest.mock('./dynamodb-client');

describe('TaskService', () => {
  let taskService: TaskService;
  const mockUserId = 'user-123';
  const mockTaskId = 'task-456';

  beforeEach(() => {
    taskService = new TaskService();
    jest.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task with valid description', async () => {
      const description = 'Buy groceries';
      
      // Mock getMaxOrder to return 5
      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: [{ order: 5 }],
        lastKey: undefined,
      });

      (dynamoDBClient.put as jest.Mock).mockResolvedValue(undefined);

      const task = await taskService.createTask(mockUserId, description);

      expect(task.userId).toBe(mockUserId);
      expect(task.description).toBe(description);
      expect(task.completed).toBe(false);
      expect(task.order).toBe(6); // maxOrder + 1
      expect(task.taskId).toBeDefined();
      expect(task.createdAt).toBeDefined();
      expect(task.updatedAt).toBeDefined();

      expect(dynamoDBClient.put).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'Tasks',
          Item: expect.objectContaining({
            userId: mockUserId,
            description,
            completed: false,
          }),
        })
      );
    });

    it('should reject empty task description', async () => {
      await expect(taskService.createTask(mockUserId, '')).rejects.toThrow(
        'Task description cannot be empty'
      );

      expect(dynamoDBClient.put).not.toHaveBeenCalled();
    });

    it('should reject whitespace-only task description', async () => {
      await expect(taskService.createTask(mockUserId, '   ')).rejects.toThrow(
        'Task description cannot be empty'
      );

      expect(dynamoDBClient.put).not.toHaveBeenCalled();
    });

    it('should trim task description', async () => {
      const description = '  Buy groceries  ';
      
      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: [],
        lastKey: undefined,
      });

      (dynamoDBClient.put as jest.Mock).mockResolvedValue(undefined);

      const task = await taskService.createTask(mockUserId, description);

      expect(task.description).toBe('Buy groceries');
    });

    it('should assign order 1 for first task', async () => {
      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: [],
        lastKey: undefined,
      });

      (dynamoDBClient.put as jest.Mock).mockResolvedValue(undefined);

      const task = await taskService.createTask(mockUserId, 'First task');

      expect(task.order).toBe(1);
    });
  });

  describe('getTask', () => {
    it('should retrieve a task by userId and taskId', async () => {
      const mockTask: Task = {
        userId: mockUserId,
        taskId: mockTaskId,
        description: 'Test task',
        completed: false,
        order: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (dynamoDBClient.get as jest.Mock).mockResolvedValue(mockTask);

      const task = await taskService.getTask(mockUserId, mockTaskId);

      expect(task).toEqual(mockTask);
      expect(dynamoDBClient.get).toHaveBeenCalledWith({
        TableName: 'Tasks',
        Key: {
          userId: mockUserId,
          taskId: mockTaskId,
        },
      });
    });

    it('should return null if task not found', async () => {
      (dynamoDBClient.get as jest.Mock).mockResolvedValue(null);

      const task = await taskService.getTask(mockUserId, 'non-existent');

      expect(task).toBeNull();
    });
  });

  describe('listTasks', () => {
    it('should list tasks with pagination', async () => {
      const mockTasks: Task[] = [
        {
          userId: mockUserId,
          taskId: 'task-1',
          description: 'Task 1',
          completed: false,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          userId: mockUserId,
          taskId: 'task-2',
          description: 'Task 2',
          completed: false,
          order: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const mockLastKey = { userId: mockUserId, taskId: 'task-2' };

      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: mockTasks,
        lastKey: mockLastKey,
      });

      const result = await taskService.listTasks(mockUserId, {
        limit: 50,
        showCompleted: true,
      });

      expect(result.tasks).toEqual(mockTasks);
      expect(result.hasMore).toBe(true);
      expect(result.lastKey).toBeDefined();
    });

    it('should filter completed tasks when showCompleted is false', async () => {
      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: [],
        lastKey: undefined,
      });

      await taskService.listTasks(mockUserId, {
        limit: 50,
        showCompleted: false,
      });

      expect(dynamoDBClient.queryWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'completed = :completed',
          ExpressionAttributeValues: expect.objectContaining({
            ':completed': false,
          }),
        })
      );
    });

    it('should use pagination token if provided', async () => {
      const lastKey = JSON.stringify({ userId: mockUserId, taskId: 'task-10' });

      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: [],
        lastKey: undefined,
      });

      await taskService.listTasks(mockUserId, {
        limit: 50,
        lastKey,
        showCompleted: true,
      });

      expect(dynamoDBClient.queryWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          ExclusiveStartKey: JSON.parse(lastKey),
        })
      );
    });
  });

  describe('updateTask', () => {
    it('should update task description', async () => {
      const updatedTask: Task = {
        userId: mockUserId,
        taskId: mockTaskId,
        description: 'Updated description',
        completed: false,
        order: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (dynamoDBClient.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(mockUserId, mockTaskId, {
        description: 'Updated description',
      });

      expect(result).toEqual(updatedTask);
      expect(dynamoDBClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: 'Tasks',
          Key: {
            userId: mockUserId,
            taskId: mockTaskId,
          },
          UpdateExpression: expect.stringContaining('#description = :description'),
        })
      );
    });

    it('should toggle task completion status', async () => {
      const updatedTask: Task = {
        userId: mockUserId,
        taskId: mockTaskId,
        description: 'Test task',
        completed: true,
        order: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (dynamoDBClient.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(mockUserId, mockTaskId, {
        completed: true,
      });

      expect(result.completed).toBe(true);
    });

    it('should reject empty description update', async () => {
      await expect(
        taskService.updateTask(mockUserId, mockTaskId, { description: '' })
      ).rejects.toThrow('Task description cannot be empty');

      expect(dynamoDBClient.update).not.toHaveBeenCalled();
    });

    it('should update order value', async () => {
      const updatedTask: Task = {
        userId: mockUserId,
        taskId: mockTaskId,
        description: 'Test task',
        completed: false,
        order: 5,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (dynamoDBClient.update as jest.Mock).mockResolvedValue(updatedTask);

      const result = await taskService.updateTask(mockUserId, mockTaskId, {
        order: 5,
      });

      expect(result.order).toBe(5);
    });

    it('should throw error if task not found', async () => {
      (dynamoDBClient.update as jest.Mock).mockResolvedValue(null);

      await expect(
        taskService.updateTask(mockUserId, 'non-existent', { completed: true })
      ).rejects.toThrow('Task not found');
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      (dynamoDBClient.delete as jest.Mock).mockResolvedValue(undefined);

      const result = await taskService.deleteTask(mockUserId, mockTaskId);

      expect(result).toBe(true);
      expect(dynamoDBClient.delete).toHaveBeenCalledWith({
        TableName: 'Tasks',
        Key: {
          userId: mockUserId,
          taskId: mockTaskId,
        },
      });
    });
  });

  describe('validateTaskDescription', () => {
    it('should return true for valid description', () => {
      expect(taskService.validateTaskDescription('Valid task')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(taskService.validateTaskDescription('')).toBe(false);
    });

    it('should return false for whitespace-only string', () => {
      expect(taskService.validateTaskDescription('   ')).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(taskService.validateTaskDescription(null as any)).toBe(false);
      expect(taskService.validateTaskDescription(undefined as any)).toBe(false);
    });
  });

  describe('reorderTask', () => {
    it('should reorder a task to new position', async () => {
      const mockTasks: Task[] = [
        {
          userId: mockUserId,
          taskId: 'task-1',
          description: 'Task 1',
          completed: false,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          userId: mockUserId,
          taskId: 'task-2',
          description: 'Task 2',
          completed: false,
          order: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          userId: mockUserId,
          taskId: 'task-3',
          description: 'Task 3',
          completed: false,
          order: 3,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: mockTasks,
        lastKey: undefined,
      });

      (dynamoDBClient.update as jest.Mock).mockResolvedValue({
        ...mockTasks[0],
        order: 3,
      });

      await taskService.reorderTask(mockUserId, 'task-1', 2);

      expect(dynamoDBClient.update).toHaveBeenCalled();
    });

    it('should throw error if task not found', async () => {
      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: [],
        lastKey: undefined,
      });

      await expect(
        taskService.reorderTask(mockUserId, 'non-existent', 0)
      ).rejects.toThrow('Task not found');
    });

    it('should throw error for invalid position', async () => {
      const mockTasks: Task[] = [
        {
          userId: mockUserId,
          taskId: 'task-1',
          description: 'Task 1',
          completed: false,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: mockTasks,
        lastKey: undefined,
      });

      await expect(
        taskService.reorderTask(mockUserId, 'task-1', -1)
      ).rejects.toThrow('Invalid task position');

      await expect(
        taskService.reorderTask(mockUserId, 'task-1', 10)
      ).rejects.toThrow('Invalid task position');
    });

    it('should not update if position unchanged', async () => {
      const mockTasks: Task[] = [
        {
          userId: mockUserId,
          taskId: 'task-1',
          description: 'Task 1',
          completed: false,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      (dynamoDBClient.queryWithPagination as jest.Mock).mockResolvedValue({
        items: mockTasks,
        lastKey: undefined,
      });

      await taskService.reorderTask(mockUserId, 'task-1', 0);

      expect(dynamoDBClient.update).not.toHaveBeenCalled();
    });
  });

  describe('calculateNewOrder', () => {
    it('should calculate new order when moving task forward', () => {
      const tasks: Task[] = [
        { taskId: 'task-1', order: 1 } as Task,
        { taskId: 'task-2', order: 2 } as Task,
        { taskId: 'task-3', order: 3 } as Task,
      ];

      const newOrder = taskService.calculateNewOrder(tasks, 'task-1', 2);

      expect(newOrder).toBe(3); // Position 2 (0-indexed) = order 3
    });

    it('should calculate new order when moving task backward', () => {
      const tasks: Task[] = [
        { taskId: 'task-1', order: 1 } as Task,
        { taskId: 'task-2', order: 2 } as Task,
        { taskId: 'task-3', order: 3 } as Task,
      ];

      const newOrder = taskService.calculateNewOrder(tasks, 'task-3', 0);

      expect(newOrder).toBe(1); // Position 0 (0-indexed) = order 1
    });
  });

  describe('filterCompletedTasks', () => {
    it('should filter out completed tasks', () => {
      const tasks: Task[] = [
        {
          userId: mockUserId,
          taskId: 'task-1',
          description: 'Task 1',
          completed: false,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          userId: mockUserId,
          taskId: 'task-2',
          description: 'Task 2',
          completed: true,
          order: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          userId: mockUserId,
          taskId: 'task-3',
          description: 'Task 3',
          completed: false,
          order: 3,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const filtered = taskService.filterCompletedTasks(tasks);

      expect(filtered).toHaveLength(2);
      expect(filtered.every(t => !t.completed)).toBe(true);
      expect(filtered.map(t => t.taskId)).toEqual(['task-1', 'task-3']);
    });

    it('should return empty array if all tasks completed', () => {
      const tasks: Task[] = [
        {
          userId: mockUserId,
          taskId: 'task-1',
          description: 'Task 1',
          completed: true,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const filtered = taskService.filterCompletedTasks(tasks);

      expect(filtered).toHaveLength(0);
    });

    it('should return all tasks if none completed', () => {
      const tasks: Task[] = [
        {
          userId: mockUserId,
          taskId: 'task-1',
          description: 'Task 1',
          completed: false,
          order: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
        {
          userId: mockUserId,
          taskId: 'task-2',
          description: 'Task 2',
          completed: false,
          order: 2,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ];

      const filtered = taskService.filterCompletedTasks(tasks);

      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual(tasks);
    });
  });
});
