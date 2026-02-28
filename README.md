# Task Manager Application

A serverless task manager application built with AWS SAM (Serverless Application Model), featuring comprehensive security controls and cost optimization.

## Architecture

- **Frontend**: React SPA served via S3/CloudFront
- **Backend**: AWS Lambda functions with Node.js
- **API**: API Gateway REST API
- **Database**: DynamoDB with on-demand billing
- **Security**: AWS Secrets Manager, CloudTrail, encryption at rest and in transit

## Project Structure

```
.
├── lambda/                 # Lambda function handlers
├── frontend/               # React frontend application
├── tests/                  # Test files
├── scripts/                # Utility scripts
├── app-template.yaml       # SAM template (infrastructure as code)
├── buildspec.yml           # CI/CD build specification
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript configuration
└── jest.config.js          # Jest test configuration
```

## Prerequisites

- Node.js 18.x or later
- AWS CLI configured with appropriate credentials
- AWS SAM CLI (`pip install aws-sam-cli`)

## Installation

```bash
npm install
```

## Development

```bash
# Build TypeScript
npm run build

# Watch mode
npm run watch

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Local Testing
```bash
# Validate SAM template
npm run sam:validate

# Build SAM application
npm run sam:build

# Deploy to AWS (guided)
npm run sam:deploy
```

### CI/CD Pipeline
The application is designed to be deployed through the CI/CD pipeline at https://github.com/rawsco/cicdinfra. Push to the configured branch to trigger automatic deployment.

## Testing

The project uses a dual testing approach:

- **Unit Tests**: Jest for specific scenarios and edge cases
- **Property-Based Tests**: fast-check for universal behavior validation

Run tests with:
```bash
npm test
```

## Security Features

- HTTPS/TLS 1.2+ enforcement
- Rate limiting (100 req/min per IP, 10 req/min for auth endpoints)
- Account lockout after failed login attempts
- Session management with automatic timeout
- Encryption at rest for all sensitive data
- Comprehensive audit logging
- IAM roles with least privilege
- CloudTrail logging for infrastructure changes

## Cost Optimization

- Serverless architecture with pay-per-use pricing
- DynamoDB on-demand billing
- CloudFront caching (80%+ cache hit ratio target)
- Lambda memory and timeout optimization
- Automated resource cleanup
- Cost budget alerts at 80% and 100% of $10/month threshold

## License

MIT
