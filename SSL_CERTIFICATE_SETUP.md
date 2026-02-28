# SSL Certificate Setup Guide

This guide explains how to configure SSL certificates for the Task Manager Application using AWS Certificate Manager (ACM).

## Overview

The Task Manager Application uses CloudFront to serve the React SPA over HTTPS. SSL certificates are managed through AWS Certificate Manager (ACM), which provides:

- **Free SSL certificates** when used with AWS services like CloudFront
- **Automatic renewal** before expiration (no manual intervention required)
- **DNS validation** for automated certificate issuance
- **Trusted certificate authority** certificates that work in all browsers

## Requirements

- **Requirement 5.1**: All client-server communications must use HTTPS with valid SSL certificates
- **Requirement 5.3**: SSL certificates must be issued by a trusted certificate authority
- **Requirement 5.4**: Certificates must renew automatically when within 30 days of expiration

## Prerequisites

Before setting up SSL certificates, you need:

1. A registered domain name (e.g., `example.com`)
2. Access to the domain's DNS configuration
3. AWS account with permissions to create ACM certificates and CloudFront distributions

## Setup Instructions

### Step 1: Uncomment Certificate Code in CDK Stack

Open `lib/task-manager-stack.ts` and locate the SSL Certificate Management section (around line 540). Uncomment the certificate creation code:

```typescript
const certificate = new certificatemanager.Certificate(this, 'SSLCertificate', {
  domainName: 'app.example.com', // Replace with your domain
  validation: certificatemanager.CertificateValidation.fromDns(),
});

new cdk.CfnOutput(this, 'CertificateArn', {
  value: certificate.certificateArn,
  description: 'ARN of the ACM SSL certificate',
});
```

**Important**: Replace `'app.example.com'` with your actual domain name.

### Step 2: Update CloudFront Distribution Configuration

In the same file, uncomment the certificate and domain configuration in the CloudFront distribution (around line 579):

```typescript
certificate: certificate,
domainNames: ['app.example.com'], // Replace with your domain
```

### Step 3: Deploy the Stack

Deploy the updated CDK stack:

```bash
npx cdk deploy
```

The deployment will create the ACM certificate and CloudFront distribution. The certificate will be in "Pending validation" status.

### Step 4: Add DNS Validation Records

After deployment, you need to add DNS validation records to prove you own the domain:

1. Go to the AWS Certificate Manager console in the **us-east-1 region** (CloudFront requires certificates in us-east-1)
2. Find your certificate (it will be in "Pending validation" status)
3. Click on the certificate to view details
4. Copy the CNAME record name and value provided by ACM
5. Add this CNAME record to your domain's DNS configuration

**Example DNS record**:
```
Name: _abc123.app.example.com
Type: CNAME
Value: _xyz456.acm-validations.aws.
```

### Step 5: Wait for Validation

ACM will automatically validate the certificate once the DNS record propagates (usually 5-30 minutes). The certificate status will change from "Pending validation" to "Issued".

### Step 6: Create Route53 Alias Record

Once the certificate is issued, create a Route53 alias record (or CNAME in your DNS provider) pointing your domain to the CloudFront distribution:

1. Get the CloudFront distribution domain name from the CDK output: `CloudFrontDomainName`
2. Create a DNS record:
   - **Type**: A (Alias) or CNAME
   - **Name**: `app.example.com` (your domain)
   - **Value**: CloudFront distribution domain (e.g., `d123456.cloudfront.net`)

### Step 7: Verify HTTPS Access

After DNS propagation (5-60 minutes), verify that your application is accessible via HTTPS:

```bash
curl -I https://app.example.com
```

You should see:
- HTTP/2 200 response
- Valid SSL certificate
- Automatic redirect from HTTP to HTTPS

## Certificate Renewal Monitoring

### Automatic Renewal

ACM automatically renews certificates before they expire. No manual action is required.

### Monitoring Setup

To enable certificate expiration monitoring (safety net), uncomment the alarm code in `lib/task-manager-stack.ts` (around line 660):

```typescript
const certificateExpirationAlarm = new cloudwatch.Alarm(this, 'CertificateExpirationAlarm', {
  alarmName: 'TaskManager-SSLCertificateExpiring',
  alarmDescription: 'Alert when SSL certificate is within 30 days of expiration',
  metric: new cloudwatch.Metric({
    namespace: 'AWS/CertificateManager',
    metricName: 'DaysToExpiry',
    dimensionsMap: {
      CertificateArn: certificate.certificateArn,
    },
    statistic: 'Minimum',
    period: cdk.Duration.hours(6),
  }),
  threshold: 30,
  evaluationPeriods: 1,
  comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
  treatMissingData: cloudwatch.TreatMissingData.BREACHING,
});

certificateExpirationAlarm.addAlarmAction(new cloudwatch_actions.SnsAction(alarmTopic));

new cdk.CfnOutput(this, 'CertificateExpirationAlarmName', {
  value: certificateExpirationAlarm.alarmName,
  description: 'CloudWatch alarm for SSL certificate expiration monitoring',
});
```

This alarm will:
- Check certificate expiration every 6 hours
- Alert when certificate is within 30 days of expiration
- Send notifications to the SNS topic (subscribe to receive emails)

### Subscribe to Alarm Notifications

To receive email alerts:

1. Get the SNS topic ARN from CDK output: `AlarmTopicArn`
2. Subscribe to the topic:
   ```bash
   aws sns subscribe \
     --topic-arn <AlarmTopicArn> \
     --protocol email \
     --notification-endpoint your-email@example.com
   ```
3. Confirm the subscription by clicking the link in the confirmation email

## Troubleshooting

### Certificate Stuck in "Pending validation"

- Verify the DNS CNAME record is correctly added
- Check DNS propagation: `dig _abc123.app.example.com CNAME`
- Wait up to 30 minutes for DNS propagation

### Certificate Validation Failed

- Ensure you have access to modify DNS records for the domain
- Verify the CNAME record exactly matches the values provided by ACM
- Check that there are no conflicting DNS records

### CloudFront Distribution Not Using Certificate

- Verify the certificate is in "Issued" status
- Ensure the certificate is in the us-east-1 region
- Check that the domain name in the certificate matches the CloudFront domain name

### HTTPS Not Working

- Verify DNS record points to CloudFront distribution
- Wait for DNS propagation (up to 60 minutes)
- Check CloudFront distribution status is "Deployed"
- Verify certificate is associated with the distribution

## Cost Considerations

- **ACM certificates**: Free when used with AWS services
- **CloudFront**: Pay for data transfer and requests (see Requirement 23)
- **Route53**: $0.50/month per hosted zone (if using Route53 for DNS)

## Security Best Practices

1. **TLS Version**: The stack enforces TLS 1.2 or higher (Requirement 5.5)
2. **HTTP Redirect**: All HTTP requests are automatically redirected to HTTPS (Requirement 5.2)
3. **Certificate Authority**: ACM certificates are issued by Amazon Trust Services, a trusted CA (Requirement 5.3)
4. **Automatic Renewal**: ACM handles renewal automatically (Requirement 5.4)

## Additional Resources

- [AWS Certificate Manager Documentation](https://docs.aws.amazon.com/acm/)
- [CloudFront SSL/TLS Configuration](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https.html)
- [ACM Certificate Validation](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html)
