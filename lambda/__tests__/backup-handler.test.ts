/**
 * Unit tests for DynamoDB Backup Handler
 * 
 * Tests the backup creation and cleanup logic
 */

import { DynamoDBClient, CreateBackupCommand, ListBackupsCommand, DeleteBackupCommand } from '@aws-sdk/client-dynamodb';
import { handler } from '../backup-handler';

// Mock the DynamoDB client
jest.mock('@aws-sdk/client-dynamodb');

const mockDynamoDBClient = DynamoDBClient as jest.MockedClass<typeof DynamoDBClient>;
const mockSend = jest.fn();

describe('DynamoDB Backup Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDynamoDBClient.prototype.send = mockSend;
    
    // Set environment variables
    process.env.USERS_TABLE_NAME = 'TaskManager-Users';
    process.env.TASKS_TABLE_NAME = 'TaskManager-Tasks';
    process.env.SESSIONS_TABLE_NAME = 'TaskManager-Sessions';
    process.env.AUDIT_LOG_TABLE_NAME = 'TaskManager-AuditLog';
  });

  describe('Backup Creation', () => {
    it('should create backups for all tables', async () => {
      // Mock successful backup creation
      mockSend.mockImplementation((command) => {
        if (command instanceof CreateBackupCommand) {
          return Promise.resolve({
            BackupDetails: {
              BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/test-backup',
              BackupName: 'test-backup',
              BackupStatus: 'CREATING',
            },
          });
        }
        if (command instanceof ListBackupsCommand) {
          return Promise.resolve({
            BackupSummaries: [],
          });
        }
        return Promise.resolve({});
      });

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Should create 4 backups (Users, Tasks, Sessions, AuditLog)
      expect(body.backups.total).toBe(4);
      expect(body.backups.successful).toBe(4);
      expect(body.backups.failed).toBe(0);
      
      // Verify CreateBackupCommand was called for each table
      const createBackupCalls = mockSend.mock.calls.filter(
        call => call[0] instanceof CreateBackupCommand
      );
      expect(createBackupCalls).toHaveLength(4);
    });

    it('should handle backup creation failures gracefully', async () => {
      // Mock one failed backup
      let callCount = 0;
      mockSend.mockImplementation((command) => {
        if (command instanceof CreateBackupCommand) {
          callCount++;
          if (callCount === 1) {
            return Promise.reject(new Error('Backup creation failed'));
          }
          return Promise.resolve({
            BackupDetails: {
              BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/test-backup',
              BackupName: 'test-backup',
              BackupStatus: 'CREATING',
            },
          });
        }
        if (command instanceof ListBackupsCommand) {
          return Promise.resolve({
            BackupSummaries: [],
          });
        }
        return Promise.resolve({});
      });

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Should have 1 failed and 3 successful backups
      expect(body.backups.total).toBe(4);
      expect(body.backups.successful).toBe(3);
      expect(body.backups.failed).toBe(1);
    });

    it('should throw error if all backups fail', async () => {
      // Mock all backups failing
      mockSend.mockImplementation((command) => {
        if (command instanceof CreateBackupCommand) {
          return Promise.reject(new Error('Backup creation failed'));
        }
        if (command instanceof ListBackupsCommand) {
          return Promise.resolve({
            BackupSummaries: [],
          });
        }
        return Promise.resolve({});
      });

      await expect(handler({})).rejects.toThrow('All backups failed');
    });
  });

  describe('Backup Cleanup', () => {
    it('should delete backups older than 30 days', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      mockSend.mockImplementation((command) => {
        if (command instanceof CreateBackupCommand) {
          return Promise.resolve({
            BackupDetails: {
              BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/test-backup',
              BackupName: 'test-backup',
              BackupStatus: 'CREATING',
            },
          });
        }
        if (command instanceof ListBackupsCommand) {
          return Promise.resolve({
            BackupSummaries: [
              {
                BackupName: 'old-backup',
                BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/old-backup',
                BackupCreationDateTime: oldDate,
              },
              {
                BackupName: 'recent-backup',
                BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/recent-backup',
                BackupCreationDateTime: recentDate,
              },
            ],
          });
        }
        if (command instanceof DeleteBackupCommand) {
          return Promise.resolve({});
        }
        return Promise.resolve({});
      });

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Should delete old backups (1 per table = 4 total)
      expect(body.cleanup.totalDeleted).toBe(4);
      
      // Verify DeleteBackupCommand was called for old backups only
      const deleteBackupCalls = mockSend.mock.calls.filter(
        call => call[0] instanceof DeleteBackupCommand
      );
      expect(deleteBackupCalls).toHaveLength(4);
    });

    it('should not delete backups within retention period', async () => {
      const now = new Date();
      const recentDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      mockSend.mockImplementation((command) => {
        if (command instanceof CreateBackupCommand) {
          return Promise.resolve({
            BackupDetails: {
              BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/test-backup',
              BackupName: 'test-backup',
              BackupStatus: 'CREATING',
            },
          });
        }
        if (command instanceof ListBackupsCommand) {
          return Promise.resolve({
            BackupSummaries: [
              {
                BackupName: 'recent-backup',
                BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/recent-backup',
                BackupCreationDateTime: recentDate,
              },
            ],
          });
        }
        return Promise.resolve({});
      });

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Should not delete any backups
      expect(body.cleanup.totalDeleted).toBe(0);
      
      // Verify DeleteBackupCommand was not called
      const deleteBackupCalls = mockSend.mock.calls.filter(
        call => call[0] instanceof DeleteBackupCommand
      );
      expect(deleteBackupCalls).toHaveLength(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      const now = new Date();
      const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000); // 31 days ago

      mockSend.mockImplementation((command) => {
        if (command instanceof CreateBackupCommand) {
          return Promise.resolve({
            BackupDetails: {
              BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/test-backup',
              BackupName: 'test-backup',
              BackupStatus: 'CREATING',
            },
          });
        }
        if (command instanceof ListBackupsCommand) {
          return Promise.resolve({
            BackupSummaries: [
              {
                BackupName: 'old-backup',
                BackupArn: 'arn:aws:dynamodb:us-east-1:123456789012:table/test/backup/old-backup',
                BackupCreationDateTime: oldDate,
              },
            ],
          });
        }
        if (command instanceof DeleteBackupCommand) {
          return Promise.reject(new Error('Delete failed'));
        }
        return Promise.resolve({});
      });

      const result = await handler({});

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      
      // Should still succeed even if cleanup fails
      expect(body.backups.successful).toBe(4);
      expect(body.cleanup.totalDeleted).toBe(0);
      expect(body.cleanup.errors.length).toBeGreaterThan(0);
    });
  });
});
