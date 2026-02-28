# Application Requirements for CI/CD Pipeline

This document describes what the Task Manager Application repository provides to work with the CI/CD pipeline infrastructure at https://github.com/rawsco/cicdinfra.

## Overview

The Task Manager Application is a serverless web application built with AWS SAM (Serverless Application Model). It will be deployed through an automated CI/CD pipeline that handles:
- Source code monitoring (GitHub)
- Build and test execution
- Multi-environment deployment (staging → production)
- Manual approval gates
- Automatic rollback on failures

## Required Files

This repository contains the required files in the root directory:

### 1. `app-template.yaml` ✓

A SAM template that defines the complete application infrastructure including DynamoDB tables, Lambda functions, API Gateway, S3 buckets, CloudTrail, CloudWatch alarms, and all other AWS resources.

**Location**: `app-template.yaml` (root directory)

**Key Resources**:
- 5 DynamoDB tables (Users, Tasks, Sessions, AuditLog, RateLimits)
- 4 Lambda functions (Auth, Task, Backup, LogCleanup)
- API Gateway REST API
- CloudFront Distribution with HTTPS enforcement, caching, and compression
- S3 buckets (Frontend, CloudTrail, CloudFront logs)
- CloudTrail for audit logging
- CloudWatch Dashboard with comprehensive monitoring
- CloudWatch alarms and monitoring
- AWS Budget with cost alerts at 80% and 100%
- SNS topic for notifications
- Secrets Manager secrets
- IAM roles with least privilege
- EventBridge rules for automated backups and log cleanup

### 2. `buildspec.yml` ✓

Defines how to build, test, and package the SAM application.

**Location**: `buildspec.yml` (root directory)

**Key phases**:
- **Install**: Installs Node.js 18, AWS SAM CLI, backend and frontend dependencies
- **Pre-build**: Runs backend and frontend tests, builds TypeScript
- **Build**: Builds frontend, builds SAM application with `sam build`, packages with `sam package`
- **Post-build**: Confirms packaging complete

**Environment variables used**:
- `ENVIRONMENT`: Either `staging` or `production`
- `ARTIFACT_BUCKET`: S3 bucket for SAM artifacts (provided by pipeline)

### 3. Application Code ✓

The application is organized as follows:

```
task-manager-app/
├── lambda/                       # Lambda function handlers
│   ├── auth-handler-main.ts     # Main auth handler (SAM entry point)
│   ├── auth-handler.ts          # Auth handler functions
│   ├── task-handler-main.ts     # Main task handler (SAM entry point)
│   ├── task-handler.ts          # Task handler functions
│   ├── backup-handler.ts        # Automated backups
│   ├── log-cleanup-handler.ts   # Log cleanup
│   └── ...                      # Other services
├── frontend/                     # React frontend application
│   ├── src/                     # Frontend source code
│   ├── dist/                    # Built frontend (generated)
│   └── package.json             # Frontend dependencies
├── tests/                        # Test files
│   └── integration/             # Integration tests
│       └── e2e-tests.ts         # End-to-end tests
├── scripts/                      # Utility scripts
│   └── verify-cost-optimization.sh  # Cost verification
├── app-template.yaml            # SAM template (REQUIRED)
├── buildspec.yml                # Build specification (REQUIRED)
├── package.json                 # Backend dependencies
├── tsconfig.json                # TypeScript configuration
└── README.md                    # Project documentation
```

## Pipeline Integration

### How the Pipeline Works

1. **Source Stage**: Monitors GitHub repository for commits to the specified branch
2. **Build Stage**: Executes `buildspec.yml` to build and test the application
3. **Deploy Staging**: Deploys to staging environment using SAM/CloudFormation
4. **Manual Approval**: Waits for manual approval before production deployment
5. **Deploy Production**: Deploys to production environment using SAM/CloudFormation

### Environment Parameters

The pipeline passes the `ENVIRONMENT` parameter to CloudFormation:
- `staging`: Deploys to staging environment
- `production`: Deploys to production environment

The SAM template uses this parameter to configure environment-specific settings.

### Stack Naming

The application creates CloudFormation stacks named:
- Staging: `{ProjectName}-staging-app`
- Production: `{ProjectName}-production-app`

The stack includes environment-specific resource naming using the `Environment` parameter.

## AWS Resources Created

The SAM template creates the following AWS resources:

### Data Storage
- **DynamoDB Tables**: Users, Tasks, Sessions, AuditLog, RateLimits (with encryption, PITR, on-demand billing)

### Compute
- **Lambda Functions**: Auth handler, Task handler, Backup handler, Log cleanup handler

### API & Networking
- **API Gateway**: REST API with throttling (100 req/sec, 10 req/sec for auth endpoints)
- **CloudFront**: Distribution with HTTPS enforcement, caching, compression
- **S3 Buckets**: Frontend hosting, CloudTrail logs, CloudFront logs

### Security
- **Secrets Manager**: Database encryption keys, JWT signing keys
- **CloudTrail**: Infrastructure audit logging
- **IAM Roles**: Lambda execution roles with least privilege

### Monitoring
- **CloudWatch**: Log groups (30-day retention), alarms, comprehensive dashboard
- **CloudWatch Dashboard**: Monitors API Gateway, Lambda, DynamoDB, CloudFront, and cost metrics
- **SNS Topics**: Alarm notifications
- **AWS Budgets**: $10/month budget with 80% and 100% alerts

### Automation
- **EventBridge Rules**: Daily backups (3 AM UTC), log cleanup (2 AM UTC)

## Build and Test Process

### Dependencies
- **Node.js**: 18.x
- **AWS SAM CLI**: Latest version (installed during build)
- **TypeScript**: 5.x
- **Jest**: Test framework
- **React**: Frontend framework

### Build Steps

1. **Install dependencies**:
   ```bash
   npm ci                    # Backend dependencies
   cd frontend && npm ci     # Frontend dependencies
   ```

2. **Run tests**:
   ```bash
   npm test                  # Backend unit tests
   cd frontend && npm test -- --run  # Frontend tests
   ```

3. **Build application**:
   ```bash
   npm run build             # Compile TypeScript
   cd frontend && npm run build  # Build React app
   ```

4. **Build SAM application**:
   ```bash
   sam build --template-file app-template.yaml
   ```

5. **Package SAM application**:
   ```bash
   sam package --template-file .aws-sam/build/template.yaml \
     --output-template-file packaged-template.yaml \
     --s3-bucket $ARTIFACT_BUCKET
   ```

6. **Deploy via CI/CD pipeline**:
   The pipeline automatically deploys the packaged template to staging and production environments.

### Test Coverage

- **Unit Tests**: Lambda handlers, services, utilities
- **Integration Tests**: End-to-end API workflows (`tests/integration/e2e-tests.ts`)
- **Property-Based Tests**: Optional, for correctness properties

## Environment Variables

The following environment variables should be configured in the CI/CD pipeline:

### Required for Build
- `ENVIRONMENT`: `staging` or `production`
- `AWS_REGION`: Target AWS region (e.g., `us-east-1`)
- `AWS_ACCOUNT_ID`: AWS account ID

### Optional for Deployment
- `FRONTEND_BUCKET`: S3 bucket name (extracted from CDK outputs if not provided)
- `CLOUDFRONT_DISTRIBUTION_ID`: CloudFront distribution ID (extracted from CDK outputs if not provided)

### Application Configuration (Set in CDK Stack)
- `SES_FROM_EMAIL`: Email for sending notifications (must be verified in SES)
- `ALARM_EMAIL`: Email for CloudWatch alarms (subscribe to SNS topic after deployment)

## Post-Deployment Verification

After deployment, run these verification steps:

### 1. Cost Optimization Verification
```bash
chmod +x scripts/verify-cost-optimization.sh
./scripts/verify-cost-optimization.sh
```

Verifies:
- DynamoDB on-demand billing enabled
- CloudFront cache hit ratio > 80%
- Lambda memory and timeout optimized
- S3 Intelligent-Tiering enabled
- CloudWatch log retention = 30 days

### 2. End-to-End Tests
```bash
export API_ENDPOINT=$(aws cloudformation describe-stacks --stack-name TaskManagerStack --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' --output text)
npm test -- tests/integration/e2e-tests.ts
```

Tests:
- User registration and verification
- Login and session management
- Password reset flow
- Task CRUD operations
- Task reordering
- Multi-user data isolation
- Rate limiting
- Account lockout

### 3. CloudWatch Alarms Check
```bash
aws cloudwatch describe-alarms --alarm-name-prefix "TaskManager-" --state-value ALARM
```

Ensures all alarms are in OK state.

### 4. Frontend Accessibility
```bash
CLOUDFRONT_DOMAIN=$(aws cloudformation describe-stacks --stack-name TaskManagerStack --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' --output text)
curl -I https://$CLOUDFRONT_DOMAIN
```

Verifies HTTPS access and HTTP→HTTPS redirect.

## Security Considerations

### Secrets Management
- All secrets stored in AWS Secrets Manager
- Secrets rotation configured (90-day cycle)
- No secrets committed to version control

### IAM Permissions
The CI/CD pipeline requires permissions to:
- Deploy CloudFormation stacks (SAM)
- Create/update/delete all AWS resources listed above
- Upload to S3 buckets
- Invalidate CloudFront distributions
- Read CloudWatch metrics

### Network Security
- HTTPS/TLS 1.2+ enforced on all endpoints
- API Gateway rate limiting enabled
- CORS configured for frontend domain only
- CloudFront redirects HTTP to HTTPS

## Cost Optimization

### Expected Monthly Costs
Based on moderate usage (1000 users, 10,000 tasks):
- **Lambda**: $5-10
- **API Gateway**: $3-5
- **DynamoDB**: $5-10
- **CloudFront**: $1-2
- **S3**: $0.50
- **CloudWatch**: $2-3
- **Other**: $2-3
- **Total**: $18-35/month

### Cost Controls
- Monthly budget: $10 USD
- Alerts at 80% ($8) and 100% ($10)
- On-demand billing for DynamoDB
- Automated log cleanup (30-day retention)
- CloudFront caching (80%+ hit ratio target)
- Lambda memory optimization (512MB)

## Monitoring and Alerting

### CloudWatch Alarms
- Failed authentication attempts (>10 in 5 min)
- Unusual API calls (>5000 in 5 min)
- API 4XX errors (>100 in 5 min)
- API 5XX errors (>10 in 5 min)
- Lambda errors (>10 in 5 min)
- Low cache hit ratio (<80%)
- Backup failures
- Cost budget alerts (80%, 100%)

### CloudWatch Dashboard
The SAM template includes a comprehensive CloudWatch Dashboard with widgets for:
- **API Gateway**: Request count, latency (avg, p95, p99), error rates (4XX, 5XX)
- **Lambda**: Invocations, duration (avg, p95), errors, throttles
- **DynamoDB**: Read/write capacity consumption, throttled requests, system errors
- **CloudFront**: Cache hit rate, request count
- **Cost**: Estimated monthly charges

Access the dashboard at:
```
https://console.aws.amazon.com/cloudwatch/home?region=<region>#dashboards:name=TaskManager-Monitoring-<environment>
```

### Audit Logging
- CloudTrail: All AWS API calls
- Application: Security events (login, password changes, lockouts)
- Retention: 90 days for application logs, 1 year for CloudTrail

## Backup and Recovery

### Automated Backups
- Point-in-time recovery enabled on all DynamoDB tables
- Daily on-demand backups at 3:00 AM UTC
- 30-day backup retention
- Automated cleanup of old backups

### Recovery Procedures
See `docs/BACKUP_AND_RECOVERY.md` for detailed recovery instructions.

## Rollback Strategy

If deployment fails:

1. **Automatic Rollback**: CloudFormation automatically rolls back on failure
2. **Manual Rollback**: 
   ```bash
   aws cloudformation cancel-update-stack --stack-name TaskManagerStack
   ```
3. **Frontend Rollback**: Restore previous S3 version and invalidate CloudFront cache

## Troubleshooting

### Build Fails
- Check CodeBuild logs in AWS Console
- Common issues: missing dependencies, test failures, TypeScript errors

### Deployment Fails
- Check CloudFormation events in AWS Console
- Common issues: IAM permissions, resource conflicts, invalid parameters

### Application Errors
- Check Lambda logs in CloudWatch: `/aws/lambda/TaskManager-*`
- Check API Gateway logs
- Check application audit logs in DynamoDB

## Testing Locally

Before pushing to trigger the pipeline:

### Validate SAM Template
```bash
sam validate --template-file app-template.yaml
```

### Run Tests
```bash
npm test
cd frontend && npm test -- --run
```

### Deploy to Personal AWS Account
```bash
sam build --template-file app-template.yaml
sam deploy --guided
```

## Pipeline Repository

The CI/CD pipeline infrastructure is maintained at:
- **Repository**: https://github.com/rawsco/cicdinfra
- **Documentation**: See README.md in that repository

For pipeline-related issues or questions, refer to that repository.

## Additional Documentation

- **Deployment Guide**: `DEPLOYMENT_GUIDE.md` - Detailed deployment instructions
- **Backup & Recovery**: `docs/BACKUP_AND_RECOVERY.md` - Backup and recovery procedures
- **Cost Verification**: `scripts/verify-cost-optimization.sh` - Cost optimization verification script
- **E2E Tests**: `tests/integration/e2e-tests.ts` - End-to-end test suite

## Summary

This application is ready for CI/CD pipeline integration with:
- ✅ `app-template.yaml` - Complete SAM/CloudFormation template with all resources
- ✅ `buildspec.yml` - Complete build and deployment specification
- ✅ Lambda handlers in `lambda/` directory
- ✅ React frontend in `frontend/` directory
- ✅ Integration tests in `tests/integration/`
- ✅ Cost verification script in `scripts/`
- ✅ Comprehensive documentation

The application follows all best practices for serverless applications and is optimized for cost, security, and performance.
