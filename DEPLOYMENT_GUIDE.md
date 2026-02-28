# Task Manager Application - Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the Task Manager Application to AWS. The application uses AWS SAM (Serverless Application Model) to provision a serverless infrastructure including Lambda functions, API Gateway, DynamoDB tables, CloudFront distribution, and comprehensive security controls.

**Recommended Deployment Method**: The application is designed to be deployed through the external CI/CD pipeline at https://github.com/rawsco/cicdinfra. This guide covers both CI/CD pipeline deployment and manual deployment for development/testing purposes.

## Deployment Methods

### Method 1: CI/CD Pipeline Deployment (Recommended for Production)

For production deployments, use the external CI/CD pipeline which provides:
- Automated testing before deployment
- Consistent deployment process
- Rollback capabilities
- Post-deployment verification
- Security scanning

See **APPLICATION-REQUIREMENTS.md** for detailed CI/CD pipeline integration instructions.

### Method 2: Manual Deployment (Development/Testing)

For development and testing environments, you can deploy manually using the steps below.

## CI/CD Pipeline Deployment

For production deployments using the CI/CD pipeline:

1. **Review APPLICATION-REQUIREMENTS.md** for complete pipeline integration instructions
2. **Configure environment variables** in the CI/CD pipeline
3. **Push code to repository** - the pipeline will automatically:
   - Build the application
   - Run tests
   - Deploy infrastructure
   - Deploy frontend assets
   - Run post-deployment verification

The CI/CD pipeline handles all deployment steps automatically, including:
- Building TypeScript code
- Running unit and integration tests
- Building and packaging SAM application
- Deploying to AWS
- Uploading frontend to S3/CloudFront
- Invalidating CloudFront cache
- Running cost optimization verification
- Sending deployment notifications

## Manual Deployment (Development/Testing)

### Prerequisites

#### Required Tools

1. **Node.js** (v18 or later)
   ```bash
   node --version  # Should be v18.x or later
   ```

2. **AWS CLI** (v2 or later)
   ```bash
   aws --version  # Should be 2.x or later
   ```

3. **AWS SAM CLI**
   ```bash
   pip install aws-sam-cli
   sam --version  # Should be 1.100.0 or later
   ```

### AWS Account Setup

1. **AWS Account**: You need an AWS account with appropriate permissions
2. **AWS Credentials**: Configure AWS credentials with sufficient permissions
   ```bash
   aws configure
   ```
   
   Required permissions:
   - CloudFormation (full access)
   - Lambda (full access)
   - API Gateway (full access)
   - DynamoDB (full access)
   - S3 (full access)
   - CloudFront (full access)
   - IAM (role creation and policy management)
   - CloudWatch (logs, metrics, alarms)
   - CloudTrail (trail creation)
   - Secrets Manager (secret creation)
   - SNS (topic creation)
   - EventBridge (rule creation)
   - AWS Budgets (budget creation)

3. **AWS SES Setup**: Configure AWS Simple Email Service for sending emails
   ```bash
   # Verify sender email address in SES
   aws ses verify-email-identity --email-address noreply@yourdomain.com
   
   # Check verification status
   aws ses get-identity-verification-attributes --identities noreply@yourdomain.com
   ```
   
   **Important**: In production, move SES out of sandbox mode to send emails to any recipient.

4. **S3 Bucket for SAM Artifacts**: Create an S3 bucket for SAM deployment artifacts (one-time setup per account/region)
   ```bash
   aws s3 mb s3://taskmanager-sam-artifacts-ACCOUNT-ID-REGION
   ```

## Deployment Steps

### Step 1: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### Step 2: Build the Application

```bash
# Build TypeScript code
npm run build

# Build frontend
cd frontend
npm run build
cd ..
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root (optional, for local testing):

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# Email Configuration
SES_SENDER_EMAIL=noreply@yourdomain.com

# Application Configuration
NODE_ENV=production
```

### Step 4: Review SAM Template Configuration

Before deploying, review the SAM template in `app-template.yaml`:

1. **Cost Allocation Tags**: Verify tags match your organization's requirements
2. **Budget Threshold**: Default is $10/month - adjust if needed
3. **CORS Configuration**: Update `allowOrigins` in API Gateway to your frontend domain
4. **CloudFront Domain**: Optionally configure custom domain with SSL certificate

### Step 5: Validate SAM Template

Validate the SAM template to ensure it's correct:

```bash
sam validate --template-file app-template.yaml
```

### Step 6: Deploy the Stack

Deploy the complete infrastructure stack:

```bash
npm run sam:build
npm run sam:deploy
```

Or with SAM CLI directly:

```bash
sam build --template-file app-template.yaml
sam deploy --guided
```

**Deployment Time**: Approximately 10-15 minutes

The deployment will create:
- 5 DynamoDB tables (Users, Tasks, Sessions, AuditLog, RateLimits)
- 4 Lambda functions (Auth, Task, Backup, LogCleanup)
- 1 API Gateway REST API
- 1 CloudFront distribution
- 3 S3 buckets (frontend hosting, CloudTrail logs, CloudFront logs)
- 2 Secrets Manager secrets (encryption keys, JWT signing key)
- CloudWatch log groups, alarms, and dashboard
- CloudTrail trail for audit logging
- SNS topic for alarm notifications
- EventBridge rules for automated backups and log cleanup
- AWS Budget with cost alerts

### Step 7: Note Stack Outputs

After deployment completes, SAM will output important values:

```
Outputs:
ApiEndpoint = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/staging/
CloudFrontDomainName = xxxxxxxxxx.cloudfront.net
FrontendBucketName = taskmanager-frontend-xxxx-staging
AlarmTopicArn = arn:aws:sns:us-east-1:xxxx:TaskManager-Alarms-staging
DashboardURL = https://console.aws.amazon.com/cloudwatch/...
```

**Save these outputs** - you'll need them for configuration and monitoring.

### Step 8: Configure Frontend

Update the frontend configuration with the API endpoint:

```bash
cd frontend
echo "VITE_API_ENDPOINT=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod" > .env.production
cd ..
```

Rebuild the frontend with the production API endpoint:

```bash
cd frontend
npm run build
cd ..
```

### Step 9: Deploy Frontend to S3

Upload the built frontend to the S3 bucket:

```bash
aws s3 sync frontend/dist/ s3://FRONTEND-BUCKET-NAME/ --delete
```

Replace `FRONTEND-BUCKET-NAME` with the bucket name from stack outputs.

### Step 10: Invalidate CloudFront Cache

After uploading new frontend files, invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION-ID \
  --paths "/*"
```

Replace `DISTRIBUTION-ID` with the distribution ID from stack outputs.

### Step 11: Subscribe to Alarm Notifications

Subscribe to the SNS topic to receive alarm notifications:

```bash
aws sns subscribe \
  --topic-arn ALARM-TOPIC-ARN \
  --protocol email \
  --notification-endpoint your-email@example.com
```

**Confirm the subscription** by clicking the link in the confirmation email.

### Step 12: Enable Cost Explorer

Cost Explorer must be enabled manually:

1. Navigate to [AWS Cost Management Console](https://console.aws.amazon.com/cost-management/home)
2. Click "Cost Explorer" in the left navigation
3. Click "Enable Cost Explorer"
4. Wait 24 hours for cost allocation tags to appear

## Post-Deployment Verification

### Verify DynamoDB Tables

```bash
# List all tables
aws dynamodb list-tables

# Verify encryption and PITR
aws dynamodb describe-table --table-name TaskManager-Users
aws dynamodb describe-table --table-name TaskManager-Tasks
aws dynamodb describe-table --table-name TaskManager-Sessions
aws dynamodb describe-table --table-name TaskManager-AuditLog
aws dynamodb describe-table --table-name TaskManager-RateLimits
```

Expected output should show:
- `SSEDescription.Status: ENABLED` (encryption at rest)
- `ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus: ENABLED`

### Verify Lambda Functions

```bash
# List Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `TaskManager`)].FunctionName'

# Check function configuration
aws lambda get-function-configuration --function-name TaskManager-AuthHandler
aws lambda get-function-configuration --function-name TaskManager-TaskHandler
```

Verify:
- Memory: 512 MB
- Timeout: 30 seconds
- Runtime: nodejs18.x
- Environment variables are set

### Verify API Gateway

```bash
# Get API details
aws apigateway get-rest-apis --query 'items[?name==`TaskManager API`]'

# Test API endpoint
curl https://YOUR-API-ENDPOINT/prod/
```

### Verify CloudTrail

```bash
# Describe CloudTrail
aws cloudtrail describe-trails --trail-name-list TaskManager-Trail

# Verify logging is enabled
aws cloudtrail get-trail-status --name TaskManager-Trail
```

Expected: `IsLogging: true`

### Verify CloudWatch Alarms

```bash
# List alarms
aws cloudwatch describe-alarms --alarm-name-prefix TaskManager
```

Should show alarms for:
- Failed authentication attempts
- Unusual API call patterns
- API 4XX/5XX errors
- Lambda function errors
- CloudFront cache hit ratio
- Backup failures

### Verify Secrets Manager

```bash
# List secrets
aws secretsmanager list-secrets --query 'SecretList[?starts_with(Name, `TaskManager`)].Name'

# Verify secrets exist (don't retrieve values in production)
aws secretsmanager describe-secret --secret-id TaskManager/DBEncryptionKey
aws secretsmanager describe-secret --secret-id TaskManager/JWTSigningKey
```

### Verify CloudFront Distribution

```bash
# List distributions
aws cloudfront list-distributions --query 'DistributionList.Items[?Comment==`TaskManager Frontend Distribution`]'
```

Verify:
- Status: Deployed
- ViewerProtocolPolicy: redirect-to-https
- MinimumProtocolVersion: TLSv1.2_2021

### Verify Automated Backups

```bash
# Check backup schedule
aws events describe-rule --name TaskManager-DailyBackup

# List existing backups (after first backup runs)
aws dynamodb list-backups --table-name TaskManager-Users
```

### Verify Cost Budget

```bash
# List budgets
aws budgets describe-budgets --account-id YOUR-ACCOUNT-ID
```

Should show TaskManager-MonthlyBudget with $10 limit.

## Testing the Deployment

### Test 1: Frontend Access

1. Open the CloudFront domain in a browser: `https://xxxxxxxxxx.cloudfront.net`
2. Verify HTTPS is enforced (HTTP redirects to HTTPS)
3. Verify the application loads without errors

### Test 2: User Registration

1. Navigate to the registration page
2. Fill in email and password
3. Complete CAPTCHA
4. Submit registration
5. Verify verification email is received
6. Enter verification code
7. Verify successful login

### Test 3: Task Management

1. Create a new task
2. Mark task as complete
3. Reorder tasks via drag-and-drop
4. Delete a task
5. Verify all operations persist

### Test 4: Security Headers

```bash
curl -I https://YOUR-CLOUDFRONT-DOMAIN/
```

Verify response includes:
- `Strict-Transport-Security`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy`
- `Referrer-Policy`

### Test 5: Rate Limiting

```bash
# Send multiple requests rapidly
for i in {1..150}; do
  curl -X POST https://YOUR-API-ENDPOINT/prod/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test"}' &
done
```

Verify HTTP 429 responses after exceeding rate limit.

### Test 6: CloudWatch Monitoring

1. Navigate to the CloudWatch Dashboard (use URL from stack outputs)
2. Verify metrics are being collected:
   - API Gateway request count
   - Lambda invocations
   - DynamoDB read/write capacity
   - CloudFront cache hit rate

### Test 7: Audit Logging

```bash
# Query audit log table
aws dynamodb scan --table-name TaskManager-AuditLog --max-items 10
```

Verify security events are being logged.

## Monitoring and Maintenance

### CI/CD Pipeline Monitoring

If using the CI/CD pipeline:
- Monitor pipeline execution status at https://github.com/rawsco/cicdinfra
- Review deployment logs for any issues
- Check post-deployment verification results
- Respond to pipeline failure notifications

### CloudWatch Dashboard

Access the monitoring dashboard:
```
https://console.aws.amazon.com/cloudwatch/home?region=REGION#dashboards:name=TaskManager-Monitoring
```

Monitor:
- API Gateway latency (target: p95 < 200ms)
- Lambda duration and errors
- DynamoDB capacity consumption
- CloudFront cache hit ratio (target: > 80%)
- Cost metrics

### Alarm Notifications

Alarms are configured for:
- **Failed Authentication**: > 10 failed attempts in 5 minutes
- **Unusual API Calls**: > 5000 calls in 5 minutes
- **API Errors**: > 100 4XX or > 10 5XX errors in 5 minutes
- **Lambda Errors**: > 10 errors in 5 minutes
- **Low Cache Hit Ratio**: < 80% cache hit rate
- **Backup Failures**: Any backup failure
- **Cost Alerts**: 80% and 100% of $10 monthly budget

### Automated Maintenance

The following tasks run automatically:

1. **Daily Backups** (3:00 AM UTC)
   - Creates on-demand backups of all DynamoDB tables
   - Retains backups for 30 days
   - Deletes backups older than 30 days

2. **Log Cleanup** (2:00 AM UTC)
   - Deletes CloudWatch log streams older than 30 days
   - Keeps log groups intact

3. **DynamoDB TTL**
   - Automatically deletes expired sessions
   - Automatically deletes audit logs older than 90 days
   - Automatically deletes old rate limit records

### Manual Maintenance Tasks

#### Update Lambda Functions

```bash
# Rebuild code
npm run build

# Update function code
aws lambda update-function-code \
  --function-name TaskManager-AuthHandler \
  --zip-file fileb://lambda.zip

aws lambda update-function-code \
  --function-name TaskManager-TaskHandler \
  --zip-file fileb://lambda.zip
```

#### Update Frontend

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://FRONTEND-BUCKET-NAME/ --delete
aws cloudfront create-invalidation --distribution-id DISTRIBUTION-ID --paths "/*"
cd ..
```

#### Rotate Secrets

```bash
# Generate new encryption key
aws secretsmanager update-secret \
  --secret-id TaskManager/DBEncryptionKey \
  --secret-string '{"keyVersion":"2","encryptionKey":"NEW-KEY-HERE"}'

# Generate new JWT signing key
aws secretsmanager update-secret \
  --secret-id TaskManager/JWTSigningKey \
  --secret-string '{"keyVersion":"2","signingKey":"NEW-KEY-HERE"}'
```

**Note**: Implement proper key rotation logic in Lambda functions to handle multiple key versions.

#### Review Audit Logs

```bash
# Query recent security events
aws dynamodb query \
  --table-name TaskManager-AuditLog \
  --index-name EventTypeIndex \
  --key-condition-expression "eventType = :type" \
  --expression-attribute-values '{":type":{"S":"login_attempt"}}' \
  --scan-index-forward false \
  --limit 100
```

#### Review Cost Reports

1. Navigate to [AWS Cost Explorer](https://console.aws.amazon.com/cost-management/home#/cost-explorer)
2. Filter by tags:
   - Service: TaskManager
   - Environment: Production
3. Review costs by service:
   - Lambda invocations
   - API Gateway requests
   - DynamoDB read/write capacity
   - CloudFront data transfer
   - S3 storage

## Troubleshooting

### Deployment Fails

**Issue**: SAM deployment fails with permission errors

**Solution**:
```bash
# Verify AWS credentials
aws sts get-caller-identity

# Verify S3 bucket for artifacts exists
aws s3 ls s3://taskmanager-sam-artifacts-ACCOUNT-ID-REGION

# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name TaskManagerStack
```

### Lambda Function Errors

**Issue**: Lambda functions return 500 errors

**Solution**:
```bash
# Check Lambda logs
aws logs tail /aws/lambda/TaskManager-AuthHandler --follow
aws logs tail /aws/lambda/TaskManager-TaskHandler --follow

# Check function configuration
aws lambda get-function-configuration --function-name TaskManager-AuthHandler
```

### API Gateway 403 Errors

**Issue**: API requests return 403 Forbidden

**Solution**:
- Verify CORS configuration in API Gateway
- Check API Gateway throttling limits
- Verify Lambda function permissions

### CloudFront Not Serving Content

**Issue**: CloudFront returns 403 or 404 errors

**Solution**:
```bash
# Verify S3 bucket has content
aws s3 ls s3://FRONTEND-BUCKET-NAME/

# Verify Origin Access Identity permissions
aws s3api get-bucket-policy --bucket FRONTEND-BUCKET-NAME

# Create invalidation
aws cloudfront create-invalidation --distribution-id DISTRIBUTION-ID --paths "/*"
```

### DynamoDB Throttling

**Issue**: DynamoDB operations are throttled

**Solution**:
- DynamoDB is configured with on-demand billing, which should auto-scale
- Check CloudWatch metrics for throttled requests
- Verify GSI/LSI are not causing hot partitions

### High Costs

**Issue**: AWS costs exceed budget

**Solution**:
1. Review Cost Explorer by service
2. Check CloudWatch metrics for unusual activity
3. Verify Lambda memory allocation is optimized
4. Check CloudFront cache hit ratio
5. Review DynamoDB capacity consumption
6. Check for unnecessary data transfer

## Rollback Procedure

If deployment fails or issues arise:

### Rollback Stack

```bash
# Delete the stack
sam delete --stack-name taskmanager-dev

# Or rollback to previous version
aws cloudformation cancel-update-stack --stack-name TaskManagerStack
```

### Restore from Backup

```bash
# List available backups
aws dynamodb list-backups --table-name TaskManager-Users

# Restore from backup
aws dynamodb restore-table-from-backup \
  --target-table-name TaskManager-Users-Restored \
  --backup-arn BACKUP-ARN
```

### Point-in-Time Recovery

```bash
# Restore to specific time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name TaskManager-Users \
  --target-table-name TaskManager-Users-Restored \
  --restore-date-time "2024-01-15T12:00:00Z"
```

## Security Considerations

### Production Checklist

- [ ] Update CORS configuration to allow only production frontend domain
- [ ] Move SES out of sandbox mode
- [ ] Configure custom domain with SSL certificate
- [ ] Enable AWS WAF for additional protection
- [ ] Configure AWS Shield for DDoS protection
- [ ] Enable AWS GuardDuty for threat detection
- [ ] Configure AWS Config for compliance monitoring
- [ ] Set up AWS Security Hub for centralized security findings
- [ ] Implement secret rotation Lambda functions
- [ ] Configure VPC for Lambda functions (optional, for enhanced security)
- [ ] Enable MFA for AWS account root user
- [ ] Implement least privilege IAM policies for developers
- [ ] Set up AWS Organizations for multi-account strategy
- [ ] Configure AWS CloudTrail log file validation
- [ ] Enable S3 bucket versioning for all buckets
- [ ] Configure S3 bucket lifecycle policies
- [ ] Implement AWS Backup for centralized backup management

### Compliance

The application implements the following security controls:

- **Encryption at Rest**: All DynamoDB tables use AWS-managed encryption
- **Encryption in Transit**: All communications use TLS 1.2 or higher
- **Audit Logging**: CloudTrail logs all AWS API calls
- **Security Event Logging**: Application logs all authentication and authorization events
- **Access Control**: IAM roles follow least privilege principle
- **Rate Limiting**: API Gateway throttling prevents abuse
- **Session Management**: 30-minute inactivity timeout, 24-hour maximum lifetime
- **Password Security**: Bcrypt hashing, complexity requirements, compromised password checking
- **Account Lockout**: 5 failed attempts trigger 15-minute lockout
- **Data Isolation**: Multi-tenant architecture with partition key isolation
- **Backup and Recovery**: Daily backups with 30-day retention, point-in-time recovery enabled

## Cost Optimization

### Current Configuration

The application is optimized for cost efficiency:

- **DynamoDB**: On-demand billing (pay per request)
- **Lambda**: 512MB memory, 30s timeout (optimized for performance/cost)
- **CloudFront**: 300s cache TTL, compression enabled
- **S3**: Intelligent-Tiering for automatic cost optimization
- **CloudWatch**: 30-day log retention
- **Backups**: 30-day retention period

### Expected Monthly Costs

Based on moderate usage (1000 users, 10,000 tasks):

- **Lambda**: $5-10 (1M invocations)
- **API Gateway**: $3-5 (1M requests)
- **DynamoDB**: $5-10 (on-demand reads/writes)
- **CloudFront**: $1-2 (10GB data transfer)
- **S3**: $0.50 (storage and requests)
- **CloudWatch**: $2-3 (logs and metrics)
- **Other Services**: $2-3 (Secrets Manager, SNS, EventBridge)

**Total**: $18-35/month

**Note**: Actual costs depend on usage patterns. Monitor Cost Explorer regularly.

### Cost Reduction Strategies

1. **Optimize Lambda Memory**: Test with 256MB if performance is acceptable
2. **Increase Cache TTL**: Increase CloudFront cache TTL to 600s or higher
3. **Reduce Log Retention**: Decrease to 7 days if compliance allows
4. **Optimize DynamoDB Queries**: Use indexes efficiently to minimize read capacity
5. **Batch Operations**: Batch DynamoDB writes where possible
6. **Compress Responses**: Enable compression for API responses
7. **Use Reserved Capacity**: If usage is predictable, consider DynamoDB reserved capacity

## Support and Resources

### AWS Documentation

- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/)
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/dynamodb/)
- [CloudFront Developer Guide](https://docs.aws.amazon.com/cloudfront/)

### Monitoring Resources

- CloudWatch Dashboard: See stack outputs for URL
- Cost Explorer: https://console.aws.amazon.com/cost-management/
- CloudTrail Console: https://console.aws.amazon.com/cloudtrail/
- AWS Health Dashboard: https://health.aws.amazon.com/

### Emergency Contacts

- AWS Support: https://console.aws.amazon.com/support/
- AWS Service Health: https://status.aws.amazon.com/

## Conclusion

The Task Manager Application is now deployed and ready for use. Monitor the CloudWatch dashboard regularly, respond to alarm notifications promptly, and review cost reports monthly to ensure optimal operation.

For questions or issues, refer to the troubleshooting section or contact AWS Support.
