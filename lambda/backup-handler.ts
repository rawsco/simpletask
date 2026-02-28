/**
 * DynamoDB Backup Handler
 * 
 * This Lambda function creates on-demand backups for all DynamoDB tables
 * and manages backup retention (30 days).
 * 
 * Requirements:
 * - 13.10: Implement backup and disaster recovery procedures with automated daily backups retained for 30 days
 * - 13.12: Enable DynamoDB point-in-time recovery (already enabled in CDK stack)
 */

import { DynamoDBClient, CreateBackupCommand, ListBackupsCommand, DeleteBackupCommand } from '@aws-sdk/client-dynamodb';

const dynamoDBClient = new DynamoDBClient({});

// Table names from environment variables
const TABLE_NAMES = [
  process.env.USERS_TABLE_NAME!,
  process.env.TASKS_TABLE_NAME!,
  process.env.SESSIONS_TABLE_NAME!,
  process.env.AUDIT_LOG_TABLE_NAME!,
];

// Backup retention period in days
const BACKUP_RETENTION_DAYS = 30;

interface BackupResult {
  tableName: string;
  backupArn?: string;
  success: boolean;
  error?: string;
}

interface CleanupResult {
  tableName: string;
  deletedBackups: number;
  errors: string[];
}

/**
 * Creates an on-demand backup for a DynamoDB table
 */
async function createTableBackup(tableName: string): Promise<BackupResult> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${tableName}-backup-${timestamp}`;

    console.log(`Creating backup for table: ${tableName}`);

    const command = new CreateBackupCommand({
      TableName: tableName,
      BackupName: backupName,
    });

    const response = await dynamoDBClient.send(command);

    console.log(`Backup created successfully: ${backupName}`, {
      backupArn: response.BackupDetails?.BackupArn,
      backupStatus: response.BackupDetails?.BackupStatus,
    });

    return {
      tableName,
      backupArn: response.BackupDetails?.BackupArn,
      success: true,
    };
  } catch (error) {
    console.error(`Failed to create backup for table: ${tableName}`, error);
    return {
      tableName,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Deletes backups older than the retention period
 */
async function cleanupOldBackups(tableName: string): Promise<CleanupResult> {
  const result: CleanupResult = {
    tableName,
    deletedBackups: 0,
    errors: [],
  };

  try {
    console.log(`Checking for old backups to delete for table: ${tableName}`);

    // List all backups for the table
    const listCommand = new ListBackupsCommand({
      TableName: tableName,
      BackupType: 'USER', // Only list on-demand backups (not PITR backups)
    });

    const listResponse = await dynamoDBClient.send(listCommand);
    const backups = listResponse.BackupSummaries || [];

    console.log(`Found ${backups.length} backups for table: ${tableName}`);

    // Calculate cutoff date (30 days ago)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - BACKUP_RETENTION_DAYS);

    // Delete backups older than retention period
    for (const backup of backups) {
      if (backup.BackupCreationDateTime && backup.BackupArn) {
        const backupDate = new Date(backup.BackupCreationDateTime);

        if (backupDate < cutoffDate) {
          try {
            console.log(`Deleting old backup: ${backup.BackupName} (created: ${backupDate.toISOString()})`);

            const deleteCommand = new DeleteBackupCommand({
              BackupArn: backup.BackupArn,
            });

            await dynamoDBClient.send(deleteCommand);
            result.deletedBackups++;

            console.log(`Successfully deleted backup: ${backup.BackupName}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`Failed to delete backup: ${backup.BackupName}`, error);
            result.errors.push(`Failed to delete ${backup.BackupName}: ${errorMessage}`);
          }
        }
      }
    }

    console.log(`Cleanup complete for ${tableName}: deleted ${result.deletedBackups} old backups`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to list backups for table: ${tableName}`, error);
    result.errors.push(`Failed to list backups: ${errorMessage}`);
  }

  return result;
}

/**
 * Lambda handler - creates backups for all tables and cleans up old backups
 */
export async function handler(event: any): Promise<any> {
  console.log('Starting DynamoDB backup process', {
    timestamp: new Date().toISOString(),
    tables: TABLE_NAMES,
    retentionDays: BACKUP_RETENTION_DAYS,
  });

  // Create backups for all tables
  const backupResults = await Promise.all(
    TABLE_NAMES.map(tableName => createTableBackup(tableName))
  );

  // Clean up old backups for all tables
  const cleanupResults = await Promise.all(
    TABLE_NAMES.map(tableName => cleanupOldBackups(tableName))
  );

  // Summarize results
  const successfulBackups = backupResults.filter(r => r.success).length;
  const failedBackups = backupResults.filter(r => !r.success).length;
  const totalDeletedBackups = cleanupResults.reduce((sum, r) => sum + r.deletedBackups, 0);
  const cleanupErrors = cleanupResults.flatMap(r => r.errors);

  const summary = {
    timestamp: new Date().toISOString(),
    backups: {
      total: backupResults.length,
      successful: successfulBackups,
      failed: failedBackups,
      results: backupResults,
    },
    cleanup: {
      totalDeleted: totalDeletedBackups,
      errors: cleanupErrors,
      results: cleanupResults,
    },
  };

  console.log('Backup process completed', summary);

  // Return success if at least one backup succeeded
  if (successfulBackups > 0) {
    return {
      statusCode: 200,
      body: JSON.stringify(summary),
    };
  } else {
    // All backups failed
    throw new Error(`All backups failed: ${JSON.stringify(summary)}`);
  }
}
