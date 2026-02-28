import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudtrail from 'aws-cdk-lib/aws-cloudtrail';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cloudwatch_actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as budgets from 'aws-cdk-lib/aws-budgets';

export class TaskManagerStack extends cdk.Stack {
  public readonly usersTable: dynamodb.Table;
  public readonly tasksTable: dynamodb.Table;
  public readonly sessionsTable: dynamodb.Table;
  public readonly auditLogTable: dynamodb.Table;
  public readonly rateLimitsTable: dynamodb.Table;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB Tables
    // ========================================

    // Users Table - stores user accounts and authentication data
    // Requirement 11.7, 13.7, 23.3
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'TaskManager-Users',
      partitionKey: {
        name: 'email',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand billing for cost optimization
      encryption: dynamodb.TableEncryption.AWS_MANAGED, // Encryption at rest
      pointInTimeRecovery: true, // Enable PITR for disaster recovery (Req 13.12)
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect production data
    });

    // GSI for querying by userId
    this.usersTable.addGlobalSecondaryIndex({
      indexName: 'UserIdIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Tasks Table - stores user tasks with ordering
    // Requirement 11.7, 13.7, 23.3
    this.tasksTable = new dynamodb.Table(this, 'TasksTable', {
      tableName: 'TaskManager-Tasks',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'taskId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // LSI for querying tasks by order
    this.tasksTable.addLocalSecondaryIndex({
      indexName: 'OrderIndex',
      sortKey: {
        name: 'order',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Sessions Table - stores active user sessions with TTL
    // Requirement 11.7, 13.7, 23.3
    this.sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
      tableName: 'TaskManager-Sessions',
      partitionKey: {
        name: 'sessionToken',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt', // Automatic cleanup of expired sessions
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying sessions by userId
    this.sessionsTable.addGlobalSecondaryIndex({
      indexName: 'UserSessionsIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // AuditLog Table - stores security events with TTL for 90-day retention
    // Requirement 11.7, 13.7, 23.3
    this.auditLogTable = new dynamodb.Table(this, 'AuditLogTable', {
      tableName: 'TaskManager-AuditLog',
      partitionKey: {
        name: 'eventId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl', // Automatic cleanup after 90 days
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying audit logs by userId
    this.auditLogTable.addGlobalSecondaryIndex({
      indexName: 'UserEventsIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying audit logs by event type
    this.auditLogTable.addGlobalSecondaryIndex({
      indexName: 'EventTypeIndex',
      partitionKey: {
        name: 'eventType',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // RateLimits Table - stores rate limiting counters with TTL
    // Requirement 11.7, 13.7, 23.3
    this.rateLimitsTable = new dynamodb.Table(this, 'RateLimitsTable', {
      tableName: 'TaskManager-RateLimits',
      partitionKey: {
        name: 'limitKey',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'windowStart',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'expiresAt', // Automatic cleanup of old rate limit records
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Rate limit data is ephemeral
    });

    // ========================================
    // AWS Secrets Manager
    // ========================================

    // Secret for database encryption keys
    // Requirement 13.4, 13.5
    const dbEncryptionSecret = new secretsmanager.Secret(this, 'DBEncryptionSecret', {
      secretName: 'TaskManager/DBEncryptionKey',
      description: 'Encryption key for sensitive database fields (passwords, tokens, codes)',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ keyVersion: '1' }),
        generateStringKey: 'encryptionKey',
        excludePunctuation: true,
        passwordLength: 32,
      },
    });

    // Enable automatic rotation every 90 days
    dbEncryptionSecret.addRotationSchedule('DBEncryptionKeyRotation', {
      automaticallyAfter: cdk.Duration.days(90),
    });

    // Secret for JWT signing key
    // Requirement 13.4, 13.5
    const jwtSigningSecret = new secretsmanager.Secret(this, 'JWTSigningSecret', {
      secretName: 'TaskManager/JWTSigningKey',
      description: 'JWT signing key for session token generation',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ keyVersion: '1' }),
        generateStringKey: 'signingKey',
        excludePunctuation: true,
        passwordLength: 64,
      },
    });

    // Enable automatic rotation every 90 days
    jwtSigningSecret.addRotationSchedule('JWTSigningKeyRotation', {
      automaticallyAfter: cdk.Duration.days(90),
    });

    // Export secret ARNs for Lambda function access
    new cdk.CfnOutput(this, 'DBEncryptionSecretArn', {
      value: dbEncryptionSecret.secretArn,
      description: 'ARN of the database encryption key secret',
    });

    new cdk.CfnOutput(this, 'JWTSigningSecretArn', {
      value: jwtSigningSecret.secretArn,
      description: 'ARN of the JWT signing key secret',
    });
  }
}
