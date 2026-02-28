# Application Requirements for CI/CD Pipeline

This document specifies the requirements for deploying the Task Manager Application through the external CI/CD pipeline at https://github.com/rawsco/cicdinfra.

## Overview

The Task Manager Application is a serverless web application built with AWS CDK. The application uses AWS Lambda, API Gateway, DynamoDB, S3, and CloudFront to provide a secure, scalable task management system with comprehensive security controls and cost optimization.

## Pipeline Integration

The application is designed to be deployed through an external CI/CD pipeline rather than manual `cdk deploy` commands. The pipeline should handle:

1. Building the application (TypeScript compilation)
2. Running tests (unit tests, integration tests, property-based tests)
3. Synthesizing CDK templates
4. Deploying infrastructure to AWS
5. Deploying frontend assets to S3/CloudFront
6. Running post-deployment verification

## Required Environment Variables

The following environment variables must be configured in the CI/CD pipeline:

### AWS Credentials
- `AWS_ACCESS_KEY_ID` - AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY` - AWS secret access key for deployment
- `AWS_REGION` - Target AWS region (e.g., `us-east-1`)
- `AWS_ACCOUNT_ID` - AWS account ID for deployment

### Application Configuration
- `NODE_ENV` - Set to `production` for production deployments
- `FRONTEND_DOMAIN` - (Optional) Custom domain for the frontend (e.g., `app.example.com`)
- `API_DOMAIN` - (Optional) Custom domain for the API (e.g., `api.example.com`)

### Email Configuration
- `SES_FROM_EMAIL` - Email address for sending verification and password reset emails (must be verified in AWS SES)
- `SES_REGION` - AWS region for SES (e.g., `us-east-1`)

### Notification Configuration
- `ALARM_EMAIL` - Email address for receiving CloudWatch alarm notifications
- `BUDGET_EMAIL` - Email address for receiving cost budget alerts

## Required AWS Resources

The CI/CD pipeline must have permissions to create and manage the following AWS resources:

### Core Services
- **DynamoDB**: Tables with on-demand billing, encryption at rest, point-in-time recovery
- **Lambda**: Functions with execution roles, environment variables, log groups
- **API Gateway**: REST API with throttling, CORS, custom domain (optional)
- **S3**: Buckets for frontend hosting, CloudTrail logs, CloudFront logs
- **CloudFront**: Distribution with HTTPS enforcement, caching, compression

### Security Services
- **AWS Secrets Manager**: Secrets for encryption keys and JWT signing keys
- **CloudTrail**: Trail for infrastructure audit logging
- **IAM**: Roles and policies for Lambda execution, backup, log cleanup

### Monitoring Services
- **CloudWatch**: Log groups, alarms, dashboards, metrics
- **SNS**: Topics for alarm notifications
- **AWS Budgets**: Cost budget with alerts

### Optional Services
- **ACM**: SSL/TLS certificates for custom domains (requires DNS validation)
- **Route53**: DNS records for custom domains (if using custom domains)

## Build Steps

The CI/CD pipeline should execute the following build steps:

### 1. Install Dependencies
```bash
npm ci
cd frontend && npm ci && cd ..
```

### 2. Build Backend
```bash
npm run build
```

### 3. Build Frontend
```bash
cd frontend
npm run build
cd ..
```

### 4. Run Tests
```bash
# Run unit tests
npm test

# Run integration tests
npm test -- tests/integration/

# Optional: Run property-based tests
npm test -- --testPathPattern=".*\\.pbt\\.test\\.ts$"
```

### 5. Synthesize CDK Template
```bash
npm run synth
```

## Deployment Steps

The CI/CD pipeline should execute the following deployment steps:

### 1. Deploy Infrastructure
```bash
# Deploy CDK stack
npm run cdk deploy -- --require-approval never --outputs-file cdk-outputs.json
```

### 2. Deploy Frontend Assets
```bash
# Extract S3 bucket name from CDK outputs
FRONTEND_BUCKET=$(jq -r '.TaskManagerStack.FrontendBucketName' cdk-outputs.json)

# Sync frontend build to S3
aws s3 sync frontend/dist/ s3://$FRONTEND_BUCKET/ --delete

# Extract CloudFront distribution ID from CDK outputs
DISTRIBUTION_ID=$(jq -r '.TaskManagerStack.CloudFrontDistributionId' cdk-outputs.json)

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### 3. Configure SNS Subscriptions
```bash
# Extract SNS topic ARN from CDK outputs
ALARM_TOPIC_ARN=$(jq -r '.TaskManagerStack.AlarmTopicArn' cdk-outputs.json)

# Subscribe email to alarm topic
aws sns subscribe --topic-arn $ALARM_TOPIC_ARN --protocol email --notification-endpoint $ALARM_EMAIL

# Note: Email subscription requires confirmation via email
```

### 4. Verify SES Email Address
```bash
# Verify the FROM email address in SES (if not already verified)
aws ses verify-email-identity --email-address $SES_FROM_EMAIL --region $SES_REGION

# Note: Email verification requires confirmation via email
```

## Post-Deployment Verification

After deployment, the CI/CD pipeline should run the following verification steps:

### 1. Run Cost Optimization Verification
```bash
chmod +x scripts/verify-cost-optimization.sh
./scripts/verify-cost-optimization.sh
```

### 2. Run End-to-End Tests
```bash
# Set API endpoint from CDK outputs
export API_ENDPOINT=$(jq -r '.TaskManagerStack.APIEndpoint' cdk-outputs.json)

# Run E2E tests
npm test -- tests/integration/e2e-tests.ts
```

### 3. Verify CloudWatch Alarms
```bash
# Check that all alarms are in OK state
aws cloudwatch describe-alarms --alarm-name-prefix "TaskManager-" --state-value ALARM

# If any alarms are in ALARM state, investigate and resolve
```

### 4. Verify CloudFront Distribution
```bash
# Extract CloudFront domain name from CDK outputs
CLOUDFRONT_DOMAIN=$(jq -r '.TaskManagerStack.CloudFrontDomainName' cdk-outputs.json)

# Test HTTPS access
curl -I https://$CLOUDFRONT_DOMAIN

# Verify HTTP redirects to HTTPS
curl -I http://$CLOUDFRONT_DOMAIN
```

## Security Considerations

### Secrets Management
- **Never commit secrets to version control**
- Store all secrets in the CI/CD pipeline's secret management system
- Use AWS Secrets Manager for application secrets (encryption keys, JWT signing keys)
- Rotate secrets regularly (90-day rotation configured in CDK)

### IAM Permissions
The CI/CD pipeline's AWS credentials must have the following permissions:
- Full access to CloudFormation (for CDK deployments)
- Create/update/delete permissions for all AWS resources listed above
- Read access to CloudWatch metrics and logs
- Write access to S3 buckets for frontend deployment
- CloudFront invalidation permissions

### Network Security
- All API endpoints enforce HTTPS with TLS 1.2+
- CloudFront redirects HTTP to HTTPS
- API Gateway has rate limiting enabled (100 req/min per IP, 10 req/min for auth)
- CORS is configured to allow only the frontend domain

## Cost Optimization

The application is designed for cost optimization:

### Free Tier Eligible Services
- Lambda: 1M free requests per month
- API Gateway: 1M free API calls per month
- DynamoDB: 25 GB storage, 25 RCU, 25 WCU free
- CloudFront: 1 TB data transfer out per month
- S3: 5 GB storage, 20,000 GET requests, 2,000 PUT requests

### Cost Budget
- Monthly budget: $10 USD
- Alert at 80% threshold ($8)
- Critical alert at 100% threshold ($10)
- Alerts sent to SNS topic (subscribe via email)

### Cost Monitoring
- CloudWatch dashboard tracks estimated monthly costs
- Cost allocation tags applied to all resources
- AWS Cost Explorer enabled for detailed cost analysis
- Automated cleanup of old CloudWatch logs (30-day retention)

## Rollback Strategy

If deployment fails or post-deployment verification fails:

### 1. Rollback Infrastructure
```bash
# Rollback to previous CDK stack version
aws cloudformation cancel-update-stack --stack-name TaskManagerStack

# Or delete the stack and redeploy previous version
aws cloudformation delete-stack --stack-name TaskManagerStack
npm run cdk deploy -- --require-approval never
```

### 2. Rollback Frontend
```bash
# Restore previous frontend version from S3 versioning
aws s3api list-object-versions --bucket $FRONTEND_BUCKET --prefix index.html

# Copy previous version
aws s3api copy-object --bucket $FRONTEND_BUCKET --copy-source $FRONTEND_BUCKET/index.html?versionId=<VERSION_ID> --key index.html

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

### 3. Verify Rollback
```bash
# Run post-deployment verification again
./scripts/verify-cost-optimization.sh
npm test -- tests/integration/e2e-tests.ts
```

## Monitoring and Alerting

### CloudWatch Alarms
The application creates the following CloudWatch alarms:
- Failed authentication attempts (threshold: 10 in 5 minutes)
- Unusual API call patterns (threshold: 5000 in 5 minutes)
- API 4XX errors (threshold: 100 in 5 minutes)
- API 5XX errors (threshold: 10 in 5 minutes)
- Lambda function errors (threshold: 10 in 5 minutes)
- CloudFront cache hit ratio (threshold: < 80%)
- DynamoDB backup failures (threshold: 1 in 24 hours)
- Cost budget alerts (80% and 100% of $10/month)

### CloudWatch Dashboard
A comprehensive dashboard is created with metrics for:
- API Gateway: request count, latency, error rate
- Lambda: invocations, duration, errors, throttles
- DynamoDB: read/write capacity, throttled requests, system errors
- CloudFront: cache hit rate, requests
- Cost: estimated monthly charges, Lambda invocations, API requests

### Audit Logging
- CloudTrail logs all AWS API calls to tamper-proof S3 bucket
- Application audit logs stored in DynamoDB with 90-day retention
- Security events logged: login attempts, password changes, account lockouts, rate limiting

## Backup and Recovery

### Automated Backups
- DynamoDB point-in-time recovery enabled for all tables
- Daily on-demand backups at 3:00 AM UTC
- 30-day backup retention
- Backup failure alerts sent to SNS topic

### Manual Recovery
See `docs/BACKUP_AND_RECOVERY.md` for detailed recovery procedures.

## Support and Troubleshooting

### Common Issues

**Issue: CDK deployment fails with "Resource already exists"**
- Solution: Delete the existing stack and redeploy, or use `cdk deploy --force`

**Issue: Frontend not loading after deployment**
- Solution: Check CloudFront distribution status, verify S3 bucket permissions, invalidate CloudFront cache

**Issue: API returns 403 Forbidden**
- Solution: Check CORS configuration in API Gateway, verify API key/session token

**Issue: Cost budget alerts triggered**
- Solution: Review CloudWatch dashboard for cost metrics, check for unexpected resource usage, optimize Lambda memory/timeout

### Logs and Debugging
- Lambda logs: CloudWatch Logs `/aws/lambda/TaskManager-*`
- API Gateway logs: CloudWatch Logs `/aws/apigateway/TaskManager-*`
- CloudTrail logs: S3 bucket `taskmanager-cloudtrail-*`
- Application audit logs: DynamoDB table `TaskManager-AuditLog`

### Contact
For issues with the CI/CD pipeline, refer to https://github.com/rawsco/cicdinfra

## References

- AWS CDK Documentation: https://docs.aws.amazon.com/cdk/
- AWS Lambda Best Practices: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- AWS DynamoDB Best Practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- AWS CloudFront Documentation: https://docs.aws.amazon.com/cloudfront/
- AWS Cost Optimization: https://aws.amazon.com/pricing/cost-optimization/
