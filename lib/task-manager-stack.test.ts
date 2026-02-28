import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { TaskManagerStack } from './task-manager-stack';

// Mock AWS SDK calls
process.env.AWS_REGION = 'us-east-1';
process.env.AWS_ACCOUNT_ID = '123456789012';

describe('TaskManagerStack', () => {
  let app: cdk.App;
  let stack: TaskManagerStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new TaskManagerStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  describe('DynamoDB Tables', () => {
    test('creates Users table with correct configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TaskManager-Users',
        BillingMode: 'PAY_PER_REQUEST',
        SSESpecification: {
          SSEEnabled: true,
        },
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      });
    });

    test('creates Tasks table with correct configuration', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TaskManager-Tasks',
        BillingMode: 'PAY_PER_REQUEST',
        SSESpecification: {
          SSEEnabled: true,
        },
      });
    });

    test('creates Sessions table with TTL enabled', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TaskManager-Sessions',
        TimeToLiveSpecification: {
          AttributeName: 'expiresAt',
          Enabled: true,
        },
      });
    });

    test('creates AuditLog table with TTL enabled', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TaskManager-AuditLog',
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true,
        },
      });
    });

    test('creates RateLimits table with TTL enabled', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        TableName: 'TaskManager-RateLimits',
        TimeToLiveSpecification: {
          AttributeName: 'expiresAt',
          Enabled: true,
        },
      });
    });

    test('creates all 5 DynamoDB tables', () => {
      template.resourceCountIs('AWS::DynamoDB::Table', 5);
    });
  });

  describe('Secrets Manager', () => {
    test('creates database encryption secret', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'TaskManager/DBEncryptionKey',
        Description: 'Encryption key for sensitive database fields (passwords, tokens, codes)',
      });
    });

    test('creates JWT signing secret', () => {
      template.hasResourceProperties('AWS::SecretsManager::Secret', {
        Name: 'TaskManager/JWTSigningKey',
        Description: 'JWT signing key for session token generation',
      });
    });

    test('creates 2 secrets', () => {
      template.resourceCountIs('AWS::SecretsManager::Secret', 2);
    });
  });

  describe('API Gateway', () => {
    test('creates REST API', () => {
      template.hasResourceProperties('AWS::ApiGateway::RestApi', {
        Name: 'TaskManager API',
      });
    });

    test('creates request validator', () => {
      template.hasResourceProperties('AWS::ApiGateway::RequestValidator', {
        ValidateRequestBody: true,
        ValidateRequestParameters: true,
      });
    });
  });

  describe('CloudWatch', () => {
    test('creates Lambda log group with 30-day retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: '/aws/lambda/TaskManager',
        RetentionInDays: 30,
      });
    });

    test('creates alarms for monitoring', () => {
      // Check for at least 4 alarms (failed auth, unusual API calls, 4xx, 5xx)
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      expect(Object.keys(alarms).length).toBeGreaterThanOrEqual(4);
    });

    test('creates SNS topic for alarm notifications', () => {
      template.hasResourceProperties('AWS::SNS::Topic', {
        TopicName: 'TaskManager-Alarms',
      });
    });
  });

  describe('CloudTrail', () => {
    test('creates CloudTrail', () => {
      template.hasResourceProperties('AWS::CloudTrail::Trail', {
        TrailName: 'TaskManager-Trail',
        IncludeGlobalServiceEvents: true,
        IsMultiRegionTrail: true,
      });
    });

    test('creates S3 bucket for CloudTrail logs with versioning', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        VersioningConfiguration: {
          Status: 'Enabled',
        },
      });
    });
  });

  describe('Cost Budget', () => {
    test('creates budget with $10 limit', () => {
      template.hasResourceProperties('AWS::Budgets::Budget', {
        Budget: {
          BudgetName: 'TaskManager-MonthlyBudget',
          BudgetType: 'COST',
          TimeUnit: 'MONTHLY',
          BudgetLimit: {
            Amount: 10,
            Unit: 'USD',
          },
        },
      });
    });
  });
});
