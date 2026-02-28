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
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

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
    // Cost Allocation Tags
    // ========================================
    
    // Apply cost allocation tags to all resources in the stack
    // Requirement 23.14 - Enable AWS Cost Explorer and tag all resources
    cdk.Tags.of(this).add('Environment', 'Production');
    cdk.Tags.of(this).add('Service', 'TaskManager');
    cdk.Tags.of(this).add('Owner', 'TaskManagerTeam');
    cdk.Tags.of(this).add('CostCenter', 'Engineering');
    cdk.Tags.of(this).add('Application', 'TaskManager');

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
      intelligentTieringConfigurations: [
        {
          name: 'FrontendAssetsTiering',
          archiveAccessTierTime: cdk.Duration.days(90),
          deepArchiveAccessTierTime: cdk.Duration.days(180),
        },
      ],
    });

    // Create Origin Access Identity for CloudFront to access S3
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: 'OAI for TaskManager frontend bucket',
    });

    // Grant CloudFront read access to the bucket
    frontendBucket.grantRead(originAccessIdentity);

    // ========================================
    // SSL Certificate Management with ACM
    // ========================================

    // Note: ACM certificates for CloudFront must be created in us-east-1 region
    // Requirement 5.1, 5.3 - SSL certificate from trusted CA (ACM)
    // 
    // To use a custom domain with SSL certificate:
    // 1. Uncomment the certificate creation code below
    // 2. Replace 'app.example.com' with your actual domain name
    // 3. Ensure you have access to the domain's DNS for validation
    // 4. Deploy the stack - ACM will create the certificate with DNS validation
    // 5. Add the DNS validation records to your domain's DNS configuration
    // 6. Once validated, the certificate will be automatically associated with CloudFront
    // 7. Create a Route53 alias record pointing to the CloudFront distribution
    //
    // ACM automatically handles certificate renewal (Requirement 5.4)
    // Certificates are renewed before expiration with no manual intervention required

    // Uncomment to enable custom domain with SSL certificate:
    // const certificate = new certificatemanager.Certificate(this, 'SSLCertificate', {
    //   domainName: 'app.example.com', // Replace with your domain
    //   validation: certificatemanager.CertificateValidation.fromDns(), // DNS validation (recommended for automation)
    // });
    //
    // Output certificate ARN
    // new cdk.CfnOutput(this, 'CertificateArn', {
    //   value: certificate.certificateArn,
    //   description: 'ARN of the ACM SSL certificate',
    // });

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
      // Requirement 5.1, 5.3 - SSL certificate from ACM
      // When using custom domain, uncomment the following lines:
      // certificate: certificate,
      // domainNames: ['app.example.com'], // Replace with your domain
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe edge locations for cost optimization
      enableLogging: true, // Enable access logs for monitoring
      logBucket: new s3.Bucket(this, 'CloudFrontLogBucket', {
        bucketName: `taskmanager-cloudfront-logs-${this.account}-${this.region}`,
        encryption: s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
        objectOwnership: s3.ObjectOwnership.OBJECT_WRITER, // Required for CloudFront logging
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

    // ========================================
    // SSL Certificate Expiration Monitoring
    // ========================================

    // ACM automatically renews certificates before expiration (Requirement 5.4)
    // This alarm provides a safety net to alert if renewal fails
    // Requirement 5.4 - Alert when certificate is within 30 days of expiration
    //
    // Note: This alarm will only work when a custom domain with ACM certificate is configured
    // Uncomment the following code when you have an ACM certificate:
    //
    // const certificateExpirationAlarm = new cloudwatch.Alarm(this, 'CertificateExpirationAlarm', {
    //   alarmName: 'TaskManager-SSLCertificateExpiring',
    //   alarmDescription: 'Alert when SSL certificate is within 30 days of expiration',
    //   metric: new cloudwatch.Metric({
    //     namespace: 'AWS/CertificateManager',
    //     metricName: 'DaysToExpiry',
    //     dimensionsMap: {
    //       CertificateArn: certificate.certificateArn, // Reference to the certificate created above
    //     },
    //     statistic: 'Minimum',
    //     period: cdk.Duration.hours(6), // Check every 6 hours
    //   }),
    //   threshold: 30, // Alert if certificate expires within 30 days
    //   evaluationPeriods: 1,
    //   comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    //   treatMissingData: cloudwatch.TreatMissingData.BREACHING, // Alert if metric is missing (certificate might be deleted)
    // });
    //
    // certificateExpirationAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));
    //
    // // Output alarm details
    // new cdk.CfnOutput(this, 'CertificateExpirationAlarmName', {
    //   value: certificateExpirationAlarm.alarmName,
    //   description: 'CloudWatch alarm for SSL certificate expiration monitoring',
    // });

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

    // ========================================
    // Lambda Functions with Optimized Configuration
    // ========================================

    // Create IAM role for Lambda execution with least privilege
    // Requirement 13.1, 13.11
    const lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: 'TaskManager-LambdaExecutionRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for TaskManager Lambda functions with least privilege',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB access only to required tables (Requirement 13.1, 13.11)
    this.usersTable.grantReadWriteData(lambdaExecutionRole);
    this.tasksTable.grantReadWriteData(lambdaExecutionRole);
    this.sessionsTable.grantReadWriteData(lambdaExecutionRole);
    this.auditLogTable.grantReadWriteData(lambdaExecutionRole);
    this.rateLimitsTable.grantReadWriteData(lambdaExecutionRole);

    // Grant Secrets Manager access only to required secrets (Requirement 13.1, 13.11)
    dbEncryptionSecret.grantRead(lambdaExecutionRole);
    jwtSigningSecret.grantRead(lambdaExecutionRole);

    // Grant SES send email permission (Requirement 13.1, 13.11)
    lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'], // SES doesn't support resource-level permissions for SendEmail
    }));

    // Grant CloudWatch Logs write permission (already included in AWSLambdaBasicExecutionRole)

    // Common Lambda environment variables
    const lambdaEnvironment = {
      USERS_TABLE_NAME: this.usersTable.tableName,
      TASKS_TABLE_NAME: this.tasksTable.tableName,
      SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
      AUDIT_LOG_TABLE_NAME: this.auditLogTable.tableName,
      RATE_LIMITS_TABLE_NAME: this.rateLimitsTable.tableName,
      DB_ENCRYPTION_SECRET_ARN: dbEncryptionSecret.secretArn,
      JWT_SIGNING_SECRET_ARN: jwtSigningSecret.secretArn,
      NODE_ENV: 'production',
    };

    // Authentication Lambda Function
    // Optimized configuration: 512MB memory, 30s timeout
    // Requirements: 23.9, 23.10
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      functionName: 'TaskManager-AuthHandler',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'auth-handler-main.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaExecutionRole,
      environment: lambdaEnvironment,
      memorySize: 512, // Start with 512MB, can be optimized based on CloudWatch metrics
      timeout: cdk.Duration.seconds(30), // 30 second timeout for auth operations
      logRetention: logs.RetentionDays.ONE_MONTH,
      description: 'Handles authentication operations (register, login, verify, password reset)',
    });

    // Task Management Lambda Function
    // Optimized configuration: 512MB memory, 30s timeout
    // Requirements: 23.9, 23.10
    const taskFunction = new lambda.Function(this, 'TaskFunction', {
      functionName: 'TaskManager-TaskHandler',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'task-handler-main.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: lambdaExecutionRole,
      environment: lambdaEnvironment,
      memorySize: 512, // Start with 512MB, can be optimized based on CloudWatch metrics
      timeout: cdk.Duration.seconds(30), // 30 second timeout for task operations
      logRetention: logs.RetentionDays.ONE_MONTH,
      description: 'Handles task management operations (create, update, delete, reorder, list)',
    });

    // Create Lambda alarms for monitoring
    const authFunctionErrorAlarm = new cloudwatch.Alarm(this, 'AuthFunctionErrorAlarm', {
      alarmName: 'TaskManager-AuthFunction-Errors',
      alarmDescription: 'Alert when auth function error rate is high',
      metric: authFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    authFunctionErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    const taskFunctionErrorAlarm = new cloudwatch.Alarm(this, 'TaskFunctionErrorAlarm', {
      alarmName: 'TaskManager-TaskFunction-Errors',
      alarmDescription: 'Alert when task function error rate is high',
      metric: taskFunction.metricErrors({
        period: cdk.Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    taskFunctionErrorAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Output Lambda function ARNs
    new cdk.CfnOutput(this, 'AuthFunctionArn', {
      value: authFunction.functionArn,
      description: 'ARN of the authentication Lambda function',
    });

    new cdk.CfnOutput(this, 'TaskFunctionArn', {
      value: taskFunction.functionArn,
      description: 'ARN of the task management Lambda function',
    });

    // ========================================
    // API Gateway Lambda Integrations
    // ========================================

    // Create Lambda integrations
    const authIntegration = new apigateway.LambdaIntegration(authFunction);
    const taskIntegration = new apigateway.LambdaIntegration(taskFunction);

    // Auth endpoints
    const registerResource = authResource.addResource('register');
    registerResource.addMethod('POST', authIntegration);

    const loginResource = authResource.addResource('login');
    loginResource.addMethod('POST', authIntegration);

    const logoutResource = authResource.addResource('logout');
    logoutResource.addMethod('POST', authIntegration);

    const verifyResource = authResource.addResource('verify');
    verifyResource.addMethod('POST', authIntegration);

    const resendResource = authResource.addResource('resend-verification');
    resendResource.addMethod('POST', authIntegration);

    const resetRequestResource = authResource.addResource('reset-password-request');
    resetRequestResource.addMethod('POST', authIntegration);

    const resetResource = authResource.addResource('reset-password');
    resetResource.addMethod('POST', authIntegration);

    // Task endpoints
    tasksResource.addMethod('GET', taskIntegration); // List tasks
    tasksResource.addMethod('POST', taskIntegration); // Create task

    const taskIdResource = tasksResource.addResource('{taskId}');
    taskIdResource.addMethod('PUT', taskIntegration); // Update task
    taskIdResource.addMethod('DELETE', taskIntegration); // Delete task

    const reorderResource = tasksResource.addResource('reorder');
    reorderResource.addMethod('POST', taskIntegration); // Reorder tasks

    // Note: Lambda function memory and timeout should be optimized based on CloudWatch metrics
    // Test with different memory allocations (256MB, 512MB, 1024MB) and monitor:
    // - Duration metrics
    // - Memory utilization
    // - Cost per invocation
    // Adjust to minimum required for acceptable performance (Requirement 23.9, 23.10)

    // ========================================
    // CloudWatch Dashboards
    // ========================================

    // Create comprehensive CloudWatch dashboard for monitoring
    // Task 20.1 - Set up CloudWatch dashboards
    const dashboard = new cloudwatch.Dashboard(this, 'TaskManagerDashboard', {
      dashboardName: 'TaskManager-Monitoring',
    });

    // API Gateway Metrics Section
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Request Count',
        left: [
          this.api.metricCount({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [
          this.api.metricLatency({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
          this.api.metricLatency({
            statistic: 'p95',
            period: cdk.Duration.minutes(5),
          }),
          this.api.metricLatency({
            statistic: 'p99',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Error Rate',
        left: [
          this.api.metricClientError({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: '4XX Errors',
          }),
          this.api.metricServerError({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: '5XX Errors',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'API Gateway - Total Requests (24h)',
        metrics: [
          this.api.metricCount({
            statistic: 'Sum',
            period: cdk.Duration.hours(24),
          }),
        ],
        width: 12,
      })
    );

    // Lambda Function Metrics Section
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda - Invocations',
        left: [
          authFunction.metricInvocations({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Auth Function',
          }),
          taskFunction.metricInvocations({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Task Function',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda - Duration',
        left: [
          authFunction.metricDuration({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'Auth Function Avg',
          }),
          taskFunction.metricDuration({
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'Task Function Avg',
          }),
        ],
        right: [
          authFunction.metricDuration({
            statistic: 'p95',
            period: cdk.Duration.minutes(5),
            label: 'Auth Function p95',
          }),
          taskFunction.metricDuration({
            statistic: 'p95',
            period: cdk.Duration.minutes(5),
            label: 'Task Function p95',
          }),
        ],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda - Errors',
        left: [
          authFunction.metricErrors({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Auth Function',
          }),
          taskFunction.metricErrors({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Task Function',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda - Throttles',
        left: [
          authFunction.metricThrottles({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Auth Function',
          }),
          taskFunction.metricThrottles({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Task Function',
          }),
        ],
        width: 12,
      })
    );

    // DynamoDB Metrics Section
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Read Capacity',
        left: [
          this.usersTable.metricConsumedReadCapacityUnits({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Users Table',
          }),
          this.tasksTable.metricConsumedReadCapacityUnits({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Tasks Table',
          }),
          this.sessionsTable.metricConsumedReadCapacityUnits({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Sessions Table',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Write Capacity',
        left: [
          this.usersTable.metricConsumedWriteCapacityUnits({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Users Table',
          }),
          this.tasksTable.metricConsumedWriteCapacityUnits({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Tasks Table',
          }),
          this.sessionsTable.metricConsumedWriteCapacityUnits({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Sessions Table',
          }),
        ],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Throttled Requests',
        left: [
          this.usersTable.metricUserErrors({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Users Table',
          }),
          this.tasksTable.metricUserErrors({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Tasks Table',
          }),
          this.sessionsTable.metricUserErrors({
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Sessions Table',
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - System Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SystemErrors',
            dimensionsMap: {
              TableName: this.usersTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Users Table',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SystemErrors',
            dimensionsMap: {
              TableName: this.tasksTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Tasks Table',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/DynamoDB',
            metricName: 'SystemErrors',
            dimensionsMap: {
              TableName: this.sessionsTable.tableName,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Sessions Table',
          }),
        ],
        width: 12,
      })
    );

    // Cost Metrics Section
    dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'Estimated Monthly Cost',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/Billing',
            metricName: 'EstimatedCharges',
            dimensionsMap: {
              Currency: 'USD',
            },
            statistic: 'Maximum',
            period: cdk.Duration.hours(6),
          }),
        ],
        width: 8,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Lambda Invocations (24h)',
        metrics: [
          authFunction.metricInvocations({
            statistic: 'Sum',
            period: cdk.Duration.hours(24),
          }),
          taskFunction.metricInvocations({
            statistic: 'Sum',
            period: cdk.Duration.hours(24),
          }),
        ],
        width: 8,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'API Requests (24h)',
        metrics: [
          this.api.metricCount({
            statistic: 'Sum',
            period: cdk.Duration.hours(24),
          }),
        ],
        width: 8,
      })
    );

    // CloudFront Metrics Section
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'CloudFront - Cache Hit Rate',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'CacheHitRate',
            dimensionsMap: {
              DistributionId: distribution.distributionId,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'CloudFront - Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/CloudFront',
            metricName: 'Requests',
            dimensionsMap: {
              DistributionId: distribution.distributionId,
            },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      })
    );

    // Output dashboard URL
    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'CloudWatch Dashboard URL',
    });

    // ========================================
    // Automated Resource Cleanup
    // ========================================

    // Create IAM role for log cleanup Lambda function
    // Requirement 23.15 - Implement automated cleanup of old CloudWatch logs
    const logCleanupRole = new iam.Role(this, 'LogCleanupRole', {
      roleName: 'TaskManager-LogCleanupRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for log cleanup Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions to describe and delete log streams
    logCleanupRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:DescribeLogStreams',
        'logs:DeleteLogStream',
      ],
      resources: [
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/TaskManager*:*`,
        `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/cloudtrail/TaskManager*:*`,
      ],
    }));

    // Create Lambda function for log cleanup
    const logCleanupFunction = new lambda.Function(this, 'LogCleanupFunction', {
      functionName: 'TaskManager-LogCleanup',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'log-cleanup-handler.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: logCleanupRole,
      environment: {
        LOG_GROUPS: [
          '/aws/lambda/TaskManager',
          '/aws/cloudtrail/TaskManager',
        ].join(','),
      },
      memorySize: 256, // Minimal memory for log cleanup
      timeout: cdk.Duration.minutes(5), // 5 minutes should be enough for cleanup
      logRetention: logs.RetentionDays.ONE_WEEK, // Keep cleanup logs for 1 week
      description: 'Deletes CloudWatch log streams older than 30 days',
    });

    // Create EventBridge rule to run daily at 2 AM UTC
    const cleanupRule = new events.Rule(this, 'LogCleanupSchedule', {
      ruleName: 'TaskManager-DailyLogCleanup',
      description: 'Triggers log cleanup Lambda function daily at 2 AM UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '2',
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    // Add Lambda function as target for the rule
    cleanupRule.addTarget(new targets.LambdaFunction(logCleanupFunction));

    // Output cleanup function details
    new cdk.CfnOutput(this, 'LogCleanupFunctionArn', {
      value: logCleanupFunction.functionArn,
      description: 'ARN of the log cleanup Lambda function',
    });

    new cdk.CfnOutput(this, 'LogCleanupScheduleInfo', {
      value: 'Daily at 2:00 AM UTC',
      description: 'Schedule for automated log cleanup',
    });

    // ========================================
    // DynamoDB Automated Backups
    // ========================================

    // Create IAM role for backup Lambda function
    // Requirement 13.10 - Implement backup and disaster recovery procedures
    const backupRole = new iam.Role(this, 'BackupRole', {
      roleName: 'TaskManager-BackupRole',
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Execution role for DynamoDB backup Lambda function',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions to create and manage backups
    backupRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:CreateBackup',
        'dynamodb:DescribeBackup',
        'dynamodb:ListBackups',
        'dynamodb:DeleteBackup',
      ],
      resources: [
        this.usersTable.tableArn,
        this.tasksTable.tableArn,
        this.sessionsTable.tableArn,
        this.auditLogTable.tableArn,
        `${this.usersTable.tableArn}/backup/*`,
        `${this.tasksTable.tableArn}/backup/*`,
        `${this.sessionsTable.tableArn}/backup/*`,
        `${this.auditLogTable.tableArn}/backup/*`,
      ],
    }));

    // Create Lambda function for DynamoDB backups
    const backupFunction = new lambda.Function(this, 'BackupFunction', {
      functionName: 'TaskManager-DynamoDBBackup',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'backup-handler.handler',
      code: lambda.Code.fromAsset('lambda'),
      role: backupRole,
      environment: {
        USERS_TABLE_NAME: this.usersTable.tableName,
        TASKS_TABLE_NAME: this.tasksTable.tableName,
        SESSIONS_TABLE_NAME: this.sessionsTable.tableName,
        AUDIT_LOG_TABLE_NAME: this.auditLogTable.tableName,
      },
      memorySize: 256, // Minimal memory for backup operations
      timeout: cdk.Duration.minutes(10), // 10 minutes for backup and cleanup
      logRetention: logs.RetentionDays.ONE_MONTH,
      description: 'Creates daily on-demand backups for DynamoDB tables and manages 30-day retention',
    });

    // Create EventBridge rule to run daily at 3 AM UTC
    // Requirement 13.10 - Automated daily backups
    const backupRule = new events.Rule(this, 'BackupSchedule', {
      ruleName: 'TaskManager-DailyBackup',
      description: 'Triggers DynamoDB backup Lambda function daily at 3 AM UTC',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '3',
        day: '*',
        month: '*',
        year: '*',
      }),
    });

    // Add Lambda function as target for the rule
    backupRule.addTarget(new targets.LambdaFunction(backupFunction));

    // Create CloudWatch alarm for backup failures
    const backupFailureAlarm = new cloudwatch.Alarm(this, 'BackupFailureAlarm', {
      alarmName: 'TaskManager-BackupFailures',
      alarmDescription: 'Alert when DynamoDB backup function fails',
      metric: backupFunction.metricErrors({
        period: cdk.Duration.hours(24),
        statistic: 'Sum',
      }),
      threshold: 1, // Alert on any failure
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    backupFailureAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

    // Output backup function details
    new cdk.CfnOutput(this, 'BackupFunctionArn', {
      value: backupFunction.functionArn,
      description: 'ARN of the DynamoDB backup Lambda function',
    });

    new cdk.CfnOutput(this, 'BackupScheduleInfo', {
      value: 'Daily at 3:00 AM UTC',
      description: 'Schedule for automated DynamoDB backups',
    });

    new cdk.CfnOutput(this, 'BackupRetention', {
      value: '30 days',
      description: 'Backup retention period',
    });

    // ========================================
    // Cost Explorer and Resource Tagging
    // ========================================
    
    // Note: AWS Cost Explorer must be enabled manually in the AWS Console
    // Requirement 23.14 - Enable AWS Cost Explorer
    // 
    // To enable Cost Explorer:
    // 1. Navigate to AWS Cost Management Console
    // 2. Click "Cost Explorer" in the left navigation
    // 3. Click "Enable Cost Explorer"
    // 
    // Cost allocation tags have been applied to all resources in this stack:
    // - Environment: Production
    // - Service: TaskManager
    // - Owner: TaskManagerTeam
    // - CostCenter: Engineering
    // - Application: TaskManager
    //
    // These tags will appear in Cost Explorer after 24 hours and can be used
    // to filter and analyze costs by service, environment, or cost center.
  }
}
