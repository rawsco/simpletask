/**
 * Lambda function to clean up old CloudWatch logs
 * Requirement 23.15 - Delete CloudWatch logs older than 30 days
 * 
 * This function runs daily and deletes log streams older than 30 days
 * to reduce storage costs and comply with data retention policies.
 */

import { CloudWatchLogsClient, DescribeLogStreamsCommand, DeleteLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs';
import { Handler } from 'aws-lambda';

const logsClient = new CloudWatchLogsClient({});

// Age threshold in milliseconds (30 days)
const AGE_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

interface CleanupResult {
  logGroupsProcessed: number;
  logStreamsDeleted: number;
  errors: string[];
}

/**
 * Main handler function for log cleanup
 */
export const handler: Handler = async (event, context): Promise<CleanupResult> => {
  console.log('Starting CloudWatch log cleanup process');
  console.log('Event:', JSON.stringify(event, null, 2));

  const result: CleanupResult = {
    logGroupsProcessed: 0,
    logStreamsDeleted: 0,
    errors: [],
  };

  // Get log group names from environment variable
  const logGroupNames = process.env.LOG_GROUPS?.split(',') || [];
  
  if (logGroupNames.length === 0) {
    console.warn('No log groups specified in LOG_GROUPS environment variable');
    return result;
  }

  console.log(`Processing ${logGroupNames.length} log groups`);

  // Process each log group
  for (const logGroupName of logGroupNames) {
    try {
      console.log(`Processing log group: ${logGroupName}`);
      const deletedCount = await cleanupLogGroup(logGroupName.trim());
      result.logStreamsDeleted += deletedCount;
      result.logGroupsProcessed++;
      console.log(`Deleted ${deletedCount} log streams from ${logGroupName}`);
    } catch (error) {
      const errorMessage = `Error processing log group ${logGroupName}: ${error}`;
      console.error(errorMessage);
      result.errors.push(errorMessage);
    }
  }

  console.log('Cleanup process completed');
  console.log(`Total log groups processed: ${result.logGroupsProcessed}`);
  console.log(`Total log streams deleted: ${result.logStreamsDeleted}`);
  console.log(`Total errors: ${result.errors.length}`);

  return result;
};

/**
 * Clean up old log streams in a specific log group
 */
async function cleanupLogGroup(logGroupName: string): Promise<number> {
  const now = Date.now();
  const cutoffTime = now - AGE_THRESHOLD_MS;
  let deletedCount = 0;
  let nextToken: string | undefined;

  do {
    try {
      // Describe log streams in the log group
      const describeCommand = new DescribeLogStreamsCommand({
        logGroupName,
        nextToken,
        limit: 50, // Process in batches of 50
        orderBy: 'LastEventTime',
        descending: false, // Start with oldest streams
      });

      const response = await logsClient.send(describeCommand);
      
      if (!response.logStreams || response.logStreams.length === 0) {
        console.log(`No log streams found in ${logGroupName}`);
        break;
      }

      // Filter and delete old log streams
      for (const logStream of response.logStreams) {
        if (!logStream.logStreamName) {
          continue;
        }

        // Check if log stream is older than threshold
        const lastEventTime = logStream.lastEventTimestamp || logStream.creationTime || 0;
        
        if (lastEventTime < cutoffTime) {
          try {
            console.log(`Deleting old log stream: ${logStream.logStreamName} (last event: ${new Date(lastEventTime).toISOString()})`);
            
            const deleteCommand = new DeleteLogStreamCommand({
              logGroupName,
              logStreamName: logStream.logStreamName,
            });

            await logsClient.send(deleteCommand);
            deletedCount++;
          } catch (deleteError) {
            console.error(`Failed to delete log stream ${logStream.logStreamName}:`, deleteError);
            // Continue with next stream even if one fails
          }
        } else {
          // Since streams are ordered by LastEventTime, we can stop when we hit a recent one
          console.log(`Reached recent log streams, stopping cleanup for ${logGroupName}`);
          nextToken = undefined;
          break;
        }
      }

      nextToken = response.nextToken;
    } catch (error) {
      console.error(`Error describing log streams in ${logGroupName}:`, error);
      throw error;
    }
  } while (nextToken);

  return deletedCount;
}
