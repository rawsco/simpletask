# CloudFront HTTPS Enforcement Configuration

This document describes the HTTPS enforcement implementation in the Task Manager application's CloudFront distribution.

## Requirements Addressed

- **5.1**: HTTPS with valid SSL certificate
- **5.2**: HTTP to HTTPS redirect
- **5.3**: SSL certificate from trusted CA (ACM)
- **5.5**: TLS 1.2 minimum version
- **5.6**: Reject deprecated cipher suites

## Implementation Details

### 1. HTTP to HTTPS Redirect (Requirement 5.2)

The CloudFront distribution is configured with `ViewerProtocolPolicy.REDIRECT_TO_HTTPS`, which automatically redirects all HTTP requests to HTTPS:

```typescript
viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS
```

This ensures that all client-server communications are encrypted, even if users attempt to access the application via HTTP.

### 2. TLS Version Enforcement (Requirements 5.3, 5.5)

The distribution enforces TLS 1.2 as the minimum protocol version:

```typescript
minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021
```

This security policy:
- Requires TLS 1.2 or higher for all connections
- Automatically rejects connections using older, insecure protocols (SSL 3.0, TLS 1.0, TLS 1.1)
- Rejects deprecated and insecure cipher suites (Requirement 5.6)

### 3. SSL Certificate Configuration (Requirements 5.1, 5.3)

The infrastructure is prepared for SSL certificate integration with AWS Certificate Manager (ACM):

**To configure a custom domain with SSL certificate:**

1. **Request Certificate in ACM** (must be in us-east-1 region for CloudFront):
   ```bash
   aws acm request-certificate \
     --domain-name app.example.com \
     --validation-method DNS \
     --region us-east-1
   ```

2. **Validate Domain Ownership**: Add the DNS validation records provided by ACM to your domain's DNS configuration.

3. **Update CDK Stack**: Uncomment and configure the certificate in `task-manager-stack.ts`:
   ```typescript
   const certificate = certificatemanager.Certificate.fromCertificateArn(
     this,
     'Certificate',
     'arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID'
   );

   const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
     // ... other config
     certificate: certificate,
     domainNames: ['app.example.com'],
   });
   ```

4. **Create Route53 Alias Record**: Point your domain to the CloudFront distribution.

### 4. Automatic Certificate Renewal (Requirement 5.4)

ACM automatically renews certificates before expiration:
- ACM checks certificate expiration 60 days before expiry
- Automatic renewal is attempted 45 days before expiry
- No manual intervention required for DNS-validated certificates
- Email notifications sent if renewal fails

### 5. Security Benefits

This configuration provides:
- **Encryption in transit**: All data between clients and CloudFront is encrypted
- **Man-in-the-middle protection**: TLS prevents traffic interception
- **Protocol downgrade protection**: Older, vulnerable protocols are rejected
- **Cipher suite security**: Only modern, secure cipher suites are allowed
- **Automatic security updates**: AWS manages security policy updates

## Cost Optimization

The CloudFront configuration includes cost optimization features:
- **Compression enabled**: Reduces data transfer costs (Requirement 23.8)
- **Cache TTL**: 300 seconds for static assets (Requirement 23.5)
- **Price Class 100**: Uses only North America and Europe edge locations
- **Cache hit ratio monitoring**: Alarm triggers if cache hit ratio falls below 80% (Requirement 23.4)

## Monitoring

CloudWatch alarms monitor:
- Cache hit ratio (target: 80%)
- Distribution health and availability
- Access logs stored in S3 for 30 days

## Testing HTTPS Enforcement

To verify HTTPS enforcement:

1. **Test HTTP redirect**:
   ```bash
   curl -I http://DISTRIBUTION_DOMAIN.cloudfront.net
   # Should return 301 or 302 redirect to https://
   ```

2. **Test TLS version**:
   ```bash
   # This should fail (TLS 1.1 not supported)
   openssl s_client -connect DISTRIBUTION_DOMAIN.cloudfront.net:443 -tls1_1
   
   # This should succeed (TLS 1.2 supported)
   openssl s_client -connect DISTRIBUTION_DOMAIN.cloudfront.net:443 -tls1_2
   ```

3. **Test cipher suites**:
   ```bash
   nmap --script ssl-enum-ciphers -p 443 DISTRIBUTION_DOMAIN.cloudfront.net
   # Should only show modern, secure cipher suites
   ```

## Deployment

The CloudFront distribution is automatically created when deploying the CDK stack:

```bash
npm run cdk deploy
```

After deployment, the CloudFront domain name is output and can be used to access the application over HTTPS.
