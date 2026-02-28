/**
 * DynamoDB Client Wrapper
 * 
 * Provides a wrapper around AWS DynamoDB DocumentClient with:
 * - Encryption configuration
 * - Helper functions for common operations
 * - Error handling with exponential backoff retry
 */

import { DynamoDB } from 'aws-sdk';

/**
 * Configuration for DynamoDB client
 */
interface DynamoDBConfig {
  region?: string;
  endpoint?: string; // For local testing
  maxRetries?: number;
}

/**
 * Exponential backoff configuration
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 5000,
};

/**
 * DynamoDB client wrapper class
 */
export class DynamoDBClient {
  private docClient: DynamoDB.DocumentClient;
  private retryConfig: RetryConfig;

  constructor(config: DynamoDBConfig = {}, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.docClient = new DynamoDB.DocumentClient({
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      endpoint: config.endpoint,
      maxRetries: config.maxRetries || 3,
    });
    this.retryConfig = retryConfig;
  }

  /**
   * Get a single item from DynamoDB
   */
  async get<T>(params: DynamoDB.DocumentClient.GetItemInput): Promise<T | null> {
    return this.executeWithRetry(async () => {
      const result = await this.docClient.get(params).promise();
      return (result.Item as T) || null;
    });
  }

  /**
   * Put an item into DynamoDB
   */
  async put(params: DynamoDB.DocumentClient.PutItemInput): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.docClient.put(params).promise();
    });
  }

  /**
   * Query items from DynamoDB
   */
  async query<T>(params: DynamoDB.DocumentClient.QueryInput): Promise<T[]> {
    return this.executeWithRetry(async () => {
      const result = await this.docClient.query(params).promise();
      return (result.Items as T[]) || [];
    });
  }

  /**
   * Query items with pagination support
   */
  async queryWithPagination<T>(
    params: DynamoDB.DocumentClient.QueryInput
  ): Promise<{ items: T[]; lastKey?: DynamoDB.DocumentClient.Key }> {
    return this.executeWithRetry(async () => {
      const result = await this.docClient.query(params).promise();
      return {
        items: (result.Items as T[]) || [],
        lastKey: result.LastEvaluatedKey,
      };
    });
  }

  /**
   * Update an item in DynamoDB
   */
  async update<T>(params: DynamoDB.DocumentClient.UpdateItemInput): Promise<T | null> {
    return this.executeWithRetry(async () => {
      const result = await this.docClient.update(params).promise();
      return (result.Attributes as T) || null;
    });
  }

  /**
   * Delete an item from DynamoDB
   */
  async delete(params: DynamoDB.DocumentClient.DeleteItemInput): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.docClient.delete(params).promise();
    });
  }

  /**
   * Batch write items to DynamoDB
   */
  async batchWrite(params: DynamoDB.DocumentClient.BatchWriteItemInput): Promise<void> {
    return this.executeWithRetry(async () => {
      await this.docClient.batchWrite(params).promise();
    });
  }

  /**
   * Batch get items from DynamoDB
   */
  async batchGet<T>(params: DynamoDB.DocumentClient.BatchGetItemInput): Promise<T[]> {
    return this.executeWithRetry(async () => {
      const result = await this.docClient.batchGet(params).promise();
      const items: T[] = [];
      
      if (result.Responses) {
        for (const tableName in result.Responses) {
          items.push(...(result.Responses[tableName] as T[]));
        }
      }
      
      return items;
    });
  }

  /**
   * Scan items from DynamoDB (use sparingly, prefer query)
   */
  async scan<T>(params: DynamoDB.DocumentClient.ScanInput): Promise<T[]> {
    return this.executeWithRetry(async () => {
      const result = await this.docClient.scan(params).promise();
      return (result.Items as T[]) || [];
    });
  }

  /**
   * Execute operation with exponential backoff retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      // Check if error is retryable
      if (!this.isRetryableError(error) || attempt >= this.retryConfig.maxRetries) {
        throw this.enhanceError(error);
      }

      // Calculate delay with exponential backoff and jitter
      const delay = this.calculateBackoffDelay(attempt);
      
      // Wait before retrying
      await this.sleep(delay);
      
      // Retry the operation
      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retryable error codes
    const retryableErrors = [
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'RequestLimitExceeded',
      'InternalServerError',
      'ServiceUnavailable',
    ];

    return (
      error.retryable === true ||
      retryableErrors.includes(error.code) ||
      error.statusCode === 500 ||
      error.statusCode === 503
    );
  }

  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = Math.min(
      this.retryConfig.baseDelayMs * Math.pow(2, attempt),
      this.retryConfig.maxDelayMs
    );
    
    // Add jitter (random value between 0 and delay)
    const jitter = Math.random() * exponentialDelay;
    
    return exponentialDelay + jitter;
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Enhance error with additional context
   */
  private enhanceError(error: any): Error {
    const enhancedError = new Error(
      `DynamoDB operation failed: ${error.message || 'Unknown error'}`
    );
    
    // Preserve original error properties
    Object.assign(enhancedError, {
      code: error.code,
      statusCode: error.statusCode,
      retryable: error.retryable,
      originalError: error,
    });
    
    return enhancedError;
  }
}

/**
 * Create and export a singleton instance
 */
export const dynamoDBClient = new DynamoDBClient();

/**
 * Table names (should be set via environment variables)
 */
export const TableNames = {
  USERS: process.env.USERS_TABLE_NAME || 'Users',
  TASKS: process.env.TASKS_TABLE_NAME || 'Tasks',
  SESSIONS: process.env.SESSIONS_TABLE_NAME || 'Sessions',
  AUDIT_LOG: process.env.AUDIT_LOG_TABLE_NAME || 'AuditLog',
  RATE_LIMITS: process.env.RATE_LIMITS_TABLE_NAME || 'RateLimits',
};
