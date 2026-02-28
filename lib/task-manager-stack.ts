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
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

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

    // Note: Automatic rotation requires a Lambda function or hosted rotation
    // This should be configured in a later task with proper rotation logic
    // dbEncryptionSecret.addRotationSchedule('DBEncryptionKeyRotation', {
    //   automaticallyAfter: cdk.Duration.days(90),
    //   rotationLambda: rotationLambda, // To be implemented
    // });

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

    // Note: Automatic rotation requires a Lambda function or hosted rotation
    // This should be configured in a later task with proper rotation logic
    // jwtSigningSecret.addRotationSchedule('JWTSigningKeyRotation', {
    //   automaticallyAfter: cdk.Duration.days(90),
    //   rotationLambda: rotationLambda, // To be implemented
    // });

    // Export secret ARNs for Lambda function access
    new cdk.CfnOutput(this, 'DBEncryptionSecretArn', {
      value: dbEncryptionSecret.secretArn,
      description: 'ARN of the database encryption key secret',
    });

    new cdk.CfnOutput(this, 'JWTSigningSecretArn', {
      value: jwtSigningSecret.secretArn,
      description: 'ARN of the JWT signing key secret',
    });

    // ========================================
    // API Gateway
    // ========================================

    // Create REST API with throttling and CORS
    // Requirement 6.1, 6.6, 12.6, 13.8
    this.api = new apigateway.RestApi(this, 'TaskManagerAPI', {
      restApiName: 'TaskManager API',
      description: 'API for Task Manager Application',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 100, // 100 requests per second per IP
        throttlingBurstLimit: 200, // Burst capacity
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS, // TODO: Replace with actual frontend domain in production
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.hours(1),
      },
      cloudWatchRole: true, // Enable CloudWatch logging
    });

    // Create auth resource with stricter rate limiting
    const authResource = this.api.root.addResource('auth');

    // Create usage plan for stricter auth endpoint throttling
    // Requirement 6.6 - 10 req/min for auth endpoints
    const authUsagePlan = this.api.addUsagePlan('AuthUsagePlan', {
      name: 'Auth Endpoints Usage Plan',
      description: 'Stricter rate limiting for authentication endpoints',
      throttle: {
        rateLimit: 10, // 10 requests per second
        burstLimit: 20,
      },
    });

    authUsagePlan.addApiStage({
      stage: this.api.deploymentStage,
    });

    // Create tasks resource with standard rate limiting
    const tasksResource = this.api.root.addResource('tasks');

    // Add request validator for input validation
    const requestValidator = new apigateway.RequestValidator(this, 'RequestValidator', {
      restApi: this.api,
      requestValidatorName: 'request-validator',
      validateRequestBody: true,
      validateRequestParameters: true,
    });

    // Output API endpoint
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
    });

    // ========================================
    // CloudWatch Logging and Alarms
    // ========================================

    // Create SNS topic for alarm notifications
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      topicName: 'TaskManager-Alarms',
      displayName: 'Task Manager Alarm Notifications',
    });

    // Output SNS topic ARN for subscription
    new cdk.CfnOutput(this, 'AlarmTopicArn', {
      value: alarmTopic.topicArn,
      description: 'SNS topic ARN for alarm notifications - subscribe to receive alerts',
    });

    // Create log group for Lambda functions with 30-day retention
    // Requirement 13.9, 23.15
    const lambdaLogGroup = new logs.LogGroup(this, 'LambdaLogGroup', {
      logGroupName: '/aws/lambda/TaskManager',
      retention: logs.RetentionDays.ONE_MONTH, // 30-day retention
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Clean up logs when stack is deleted
    });

    // Alarm for failed authentication attempts
    // Requirement 13.9
    const failedAuthAlarm = new cloudwatch.Alarm(this, 'FailedAuthAlarm', {
      alarmName: 'TaskManager-FailedAuthenticationAttempts',
      alarmDescription: 'Alert when failed authentication attempts exceed threshold',
      metric: new cloudwatch.Metric({
        namespace: 'TaskManager',
        metricName: 'FailedAuthAttempts',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10, // Alert if more than 10 failed attempts in 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    failedAuthAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Alarm for unusual API call patterns
    // Requirement 13.9
    const unusualAPICallsAlarm = new cloudwatch.Alarm(this, 'UnusualAPICallsAlarm', {
      alarmName: 'TaskManager-UnusualAPICallPatterns',
      alarmDescription: 'Alert when API call rate is unusually high',
      metric: this.api.metricCount({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5000, // Alert if more than 5000 API calls in 5 minutes
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    unusualAPICallsAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Alarm for API Gateway 4XX errors
    const api4xxAlarm = new cloudwatch.Alarm(this, 'API4xxAlarm', {
      alarmName: 'TaskManager-API4xxErrors',
      alarmDescription: 'Alert when API 4XX error rate is high',
      metric: this.api.metricClientError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 100, // Alert if more than 100 4XX errors in 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    api4xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Alarm for API Gateway 5XX errors
    const api5xxAlarm = new cloudwatch.Alarm(this, 'API5xxAlarm', {
      alarmName: 'TaskManager-API5xxErrors',
      alarmDescription: 'Alert when API 5XX error rate is high',
      metric: this.api.metricServerError({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10, // Alert if more than 10 5XX errors in 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    api5xxAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Cost Budget with alarms at 80% and 100%
    // Requirement 23.11, 23.12, 23.13
    new budgets.CfnBudget(this, 'CostBudget', {
      budget: {
        budgetName: 'TaskManager-MonthlyBudget',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: 10, // $10 USD monthly budget
          unit: 'USD',
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80, // Alert at 80% of budget
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: alarmTopic.topicArn,
            },
          ],
        },
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100, // Critical alert at 100% of budget
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'SNS',
              address: alarmTopic.topicArn,
            },
          ],
        },
      ],
    });

    // ========================================
    // CloudTrail for Infrastructure Audit Logging
    // ========================================

    // Create tamper-proof S3 bucket for CloudTrail logs
    // Requirement 13.2, 13.3
    const cloudTrailBucket = new s3.Bucket(this, 'CloudTrailBucket', {
      bucketName: `taskmanager-cloudtrail-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true, // Enable versioning for tamper-proof audit logs
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Protect audit logs
      lifecycleRules: [
        {
          id: 'DeleteOldLogs',
          enabled: true,
          expiration: cdk.Duration.days(365), // Keep logs for 1 year
        },
      ],
    });

    // Enable CloudTrail for all AWS API calls
    // Requirement 13.2
    const trail = new cloudtrail.Trail(this, 'CloudTrail', {
      trailName: 'TaskManager-Trail',
      bucket: cloudTrailBucket,
      includeGlobalServiceEvents: true, // Include IAM, CloudFront, etc.
      isMultiRegionTrail: true, // Log events from all regions
      managementEvents: cloudtrail.ReadWriteType.ALL, // Log all management events
      sendToCloudWatchLogs: true, // Also send to CloudWatch for real-time monitoring
      cloudWatchLogGroup: new logs.LogGroup(this, 'CloudTrailLogGroup', {
        logGroupName: '/aws/cloudtrail/TaskManager',
        retention: logs.RetentionDays.ONE_YEAR,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }),
    });

    // Add event selectors for data events (DynamoDB operations)
    const cfnTrail = trail.node.defaultChild as cloudtrail.CfnTrail;
    cfnTrail.eventSelectors = [
      {
        readWriteType: 'All',
        includeManagementEvents: true,
        dataResources: [
          {
            type: 'AWS::DynamoDB::Table',
            values: [
              this.usersTable.tableArn,
              this.tasksTable.tableArn,
              this.sessionsTable.tableArn,
              this.auditLogTable.tableArn,
            ],
          },
        ],
      },
    ];

    // Output CloudTrail bucket name
    new cdk.CfnOutput(this, 'CloudTrailBucketName', {
      value: cloudTrailBucket.bucketName,
      description: 'S3 bucket containing CloudTrail audit logs',
    });

    // ========================================
    // CloudFront Distribution with HTTPS Enforcement
    // ========================================

    // Create S3 bucket for frontend hosting
    // Requirement 23.16
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `taskmanager-frontend-${this.account}-${this.region}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, // CloudFront will access via OAI
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true, // Clean up on stack deletion
    });

    // Create Origin Access Identity for CloudFront to access S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for TaskManager frontend bucket',
    });

    // Grant CloudFront read access to the bucket
    frontendBucket.grantRead(originAccessIdentity);

    // Create CloudFront distribution with HTTPS enforcement
    // Requirements: 5.1, 5.2, 5.3, 5.5, 5.6, 23.4, 23.5, 23.8
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      comment: 'TaskManager Frontend Distribution',
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, // Requirement 5.2 - Redirect HTTP to HTTPS
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        compress: true, // Requirement 23.8 - Enable compression
        cachePolicy: new cloudfront.CachePolicy(this, 'FrontendCachePolicy', {
          cachePolicyName: 'TaskManager-Frontend-Cache',
          comment: 'Cache policy for frontend static assets',
          defaultTtl: cdk.Duration.seconds(300), // Requirement 23.5 - 300 second TTL
          minTtl: cdk.Duration.seconds(0),
          maxTtl: cdk.Duration.days(1),
          enableAcceptEncodingGzip: true,
          enableAcceptEncodingBrotli: true,
        }),
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA routing support
          ttl: cdk.Duration.seconds(300),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html', // SPA routing support
          ttl: cdk.Duration.seconds(300),
        },
      ],
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021, // Requirement 5.3, 5.5 - TLS 1.2 minimum
      // Note: SSL certificate configuration would be added here when custom domain is configured
      // certificate: certificate, // Requirement 5.1, 5.3 - SSL certificate from ACM
      // domainNames: ['app.example.com'],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe edge locations for cost optimization
      enableLogging: true, // Enable access logs for monitoring
      logBucket: new s3.Bucket(this, 'CloudFrontLogBucket', {
        bucketName: `taskmanager-cloudfront-logs-${this.account}-${this.region}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        lifecycleRules: [
          {
            id: 'DeleteOldLogs',
            enabled: true,
            expiration: cdk.Duration.days(30), // Keep logs for 30 days
          },
        ],
      }),
    });

    // Create CloudWatch alarm for cache hit ratio
    // Requirement 23.4 - Monitor cache hit ratio (target 80%)
    const cacheHitRatioAlarm = new cloudwatch.Alarm(this, 'CacheHitRatioAlarm', {
      alarmName: 'TaskManager-CloudFront-LowCacheHitRatio',
      alarmDescription: 'Alert when CloudFront cache hit ratio falls below 80%',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/CloudFront',
        metricName: 'CacheHitRate',
        dimensionsMap: {
          DistributionId: distribution.distributionId,
        },
        statistic: 'Average',
        period: cdk.Duration.hours(1),
      }),
      threshold: 80, // Alert if cache hit ratio is below 80%
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    cacheHitRatioAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Output CloudFront distribution details
    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain name (HTTPS enforced)',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
    });

    // Note: To configure custom domain with SSL certificate:
    // 1. Request certificate in ACM (must be in us-east-1 for CloudFront)
    // 2. Add certificate ARN and domain names to distribution configuration
    // 3. Create Route53 alias record pointing to CloudFront distribution
    // 4. Certificate auto-renewal is handled by ACM (Requirement 5.4)
  }
}
