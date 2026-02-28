# Testing Guide

## Known Issues

### Jest LocalStorage Error

There's a known compatibility issue between Jest 29+ and AWS CDK that causes a `SecurityError: Cannot initialize local storage` error when running tests. This is a known issue in the CDK community.

**Workaround:**

For now, infrastructure validation can be done using:

```bash
# Validate CDK infrastructure
npm run synth

# Build TypeScript
npm run build
```

**Future Fix:**

This will be resolved in a future task by either:
1. Downgrading to Jest 28
2. Using a custom Jest environment
3. Waiting for AWS CDK to fix the issue

## Running Tests

Once the Jest issue is resolved, run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## Infrastructure Validation

The infrastructure can be validated without Jest:

```bash
# Synthesize CloudFormation template
npm run synth

# Check for TypeScript errors
npm run build

# Deploy to AWS (requires AWS credentials)
npm run deploy
```

## Test Structure

- `lib/**/*.test.ts` - CDK infrastructure tests
- `lambda/**/*.test.ts` - Lambda function unit tests (to be added)
- Property-based tests use `fast-check` library
- Unit tests use `jest` framework
