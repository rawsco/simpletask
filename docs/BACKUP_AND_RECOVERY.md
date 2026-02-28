# Backup and Recovery Procedures

## Overview

The Task Manager Application implements comprehensive backup and disaster recovery procedures to protect against data loss and ensure business continuity. This document describes the backup strategy, recovery procedures, and testing protocols.

**Note**: If using the CI/CD pipeline at https://github.com/rawsco/cicdinfra, backup verification can be integrated into the pipeline's post-deployment checks. See APPLICATION-REQUIREMENTS.md for details.

## Backup Strategy

### Automated Daily Backups

**Schedule**: Daily at 3:00 AM UTC

**Scope**: All DynamoDB tables
- TaskManager-Users
- TaskManager-Tasks
- TaskManager-Sessions
- TaskManager-AuditLog
- TaskManager-RateLimits (optional, ephemeral data)

**Retention**: 30 days

**Implementation**: Lambda function triggered by EventBridge rule

### Point-in-Time Recovery (PITR)

**Status**: Enabled on all tables

**Retention**: 35 days (AWS default)

**Use Case**: Recover from accidental data deletion or corruption

### CloudTrail Audit Logs

**Retention**: 365 days in S3

**Versioning**: Enabled (tamper-proof)

**Use Case**: Compliance, forensic analysis, infrastructure recovery

## Backup Types

### 1. On-Demand Backups

**Created by**: Automated Lambda function

**Naming Convention**: `TaskManager-{TableName}-{YYYY-MM-DD}`

**Storage**: AWS DynamoDB Backups (managed service)

**Cost**: $0.10 per GB per month

**Advantages**:
- Full table backup
- Can be restored to any region
- Retained beyond 35-day PITR window
- Can be copied to another account

**Limitations**:
- Restore creates a new table (requires application reconfiguration)
- Does not include auto-scaling settings or tags

### 2. Point-in-Time Recovery (PITR)

**Enabled on**: All tables

**Recovery Window**: Any point in the last 35 days (to the second)

**Cost**: Continuous backups cost approximately 20% of table storage

**Advantages**:
- Granular recovery (to the second)
- No manual backup creation required
- Automatic and continuous

**Limitations**:
- 35-day retention limit
- Restore creates a new table
- Cannot restore to different region

### 3. CloudTrail Logs

**Purpose**: Infrastructure audit trail

**Retention**: 365 days

**Storage**: S3 bucket with versioning

**Use Case**: Recover infrastructure configuration, investigate security incidents

## Recovery Procedures

### Scenario 1: Accidental Data Deletion (Recent)

**Use Case**: User accidentally deleted tasks, data deleted within last 35 days

**Recovery Method**: Point-in-Time Recovery

**Steps**:

1. Identify the exact time before deletion occurred:
   ```bash
   # Query audit logs to find deletion time
   aws dynamodb query \
     --table-name TaskManager-AuditLog \
     --index-name EventTypeIndex \
     --key-condition-expression "eventType = :type" \
     --expression-attribute-values '{":type":{"S":"task_deleted"}}' \
     --scan-index-forward false \
     --limit 100
   ```

2. Restore table to point in time:
   ```bash
   # Restore to 5 minutes before deletion
   RESTORE_TIME="2024-01-15T10:25:00Z"
   
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name TaskManager-Tasks \
     --target-table-name TaskManager-Tasks-Restored \
     --restore-date-time "$RESTORE_TIME" \
     --region us-east-1
   ```

3. Wait for restore to complete:
   ```bash
   aws dynamodb describe-table \
     --table-name TaskManager-Tasks-Restored \
     --query 'Table.TableStatus' \
     --output text
   ```

4. Verify restored data:
   ```bash
   # Compare record counts
   aws dynamodb scan \
     --table-name TaskManager-Tasks-Restored \
     --select COUNT
   ```

5. Extract specific records from restored table:
   ```bash
   # Query for specific user's tasks
   aws dynamodb query \
     --table-name TaskManager-Tasks-Restored \
     --key-condition-expression "userId = :uid" \
     --expression-attribute-values '{":uid":{"S":"user-id-here"}}'
   ```

6. Copy recovered data back to production table:
   ```bash
   # Use AWS CLI or custom script to copy items
   # This requires careful scripting to avoid overwriting current data
   ```

7. Delete restored table:
   ```bash
   aws dynamodb delete-table \
     --table-name TaskManager-Tasks-Restored
   ```

**Recovery Time Objective (RTO)**: 30-60 minutes

**Recovery Point Objective (RPO)**: 0 seconds (exact point in time)

### Scenario 2: Data Corruption (Older than 35 days)

**Use Case**: Data corruption discovered after 35-day PITR window

**Recovery Method**: On-Demand Backup Restore

**Steps**:

1. List available backups:
   ```bash
   aws dynamodb list-backups \
     --table-name TaskManager-Tasks \
     --time-range-lower-bound 1704067200 \
     --time-range-upper-bound 1706745600
   ```

2. Identify the backup closest to the desired recovery point:
   ```bash
   # Get backup details
   aws dynamodb describe-backup \
     --backup-arn "arn:aws:dynamodb:us-east-1:123456789012:table/TaskManager-Tasks/backup/01234567890123-abcdefgh"
   ```

3. Restore from backup:
   ```bash
   aws dynamodb restore-table-from-backup \
     --target-table-name TaskManager-Tasks-Restored \
     --backup-arn "arn:aws:dynamodb:us-east-1:123456789012:table/TaskManager-Tasks/backup/01234567890123-abcdefgh"
   ```

4. Wait for restore to complete (can take several hours for large tables)

5. Verify restored data

6. Merge or replace production data as needed

**Recovery Time Objective (RTO)**: 2-4 hours (depending on table size)

**Recovery Point Objective (RPO)**: 24 hours (daily backup)

### Scenario 3: Complete Table Loss

**Use Case**: Entire table accidentally deleted or corrupted

**Recovery Method**: PITR or On-Demand Backup (depending on timing)

**Steps**:

1. Assess the situation:
   - When was the table deleted?
   - Is it within 35-day PITR window?
   - What is the most recent backup?

2. Choose recovery method:
   - **If within 35 days**: Use PITR (Scenario 1)
   - **If older**: Use on-demand backup (Scenario 2)

3. Restore table with original name:
   ```bash
   # Note: You cannot restore to the same table name if it still exists
   # If table is deleted, you can restore with original name
   
   aws dynamodb restore-table-to-point-in-time \
     --source-table-name TaskManager-Tasks \
     --target-table-name TaskManager-Tasks \
     --restore-date-time "2024-01-15T10:00:00Z"
   ```

4. Verify table configuration:
   - Check indexes (GSI/LSI)
   - Verify encryption settings
   - Check PITR is re-enabled
   - Verify TTL settings

5. Update application configuration if table name changed

6. Test application functionality

**Recovery Time Objective (RTO)**: 1-4 hours

**Recovery Point Objective (RPO)**: 0 seconds (PITR) or 24 hours (backup)

### Scenario 4: Regional Disaster

**Use Case**: Entire AWS region is unavailable

**Recovery Method**: Cross-region backup restore

**Prerequisites**:
- On-demand backups copied to another region
- Multi-region deployment strategy

**Steps**:

1. Copy backup to another region (if not already done):
   ```bash
   # This should be done proactively, not during disaster
   aws dynamodb create-backup \
     --table-name TaskManager-Tasks \
     --backup-name TaskManager-Tasks-DR-Backup
   
   # Copy to another region (requires AWS Backup or custom solution)
   ```

2. Deploy CDK stack to backup region:
   ```bash
   export AWS_REGION=us-west-2
   cdk deploy
   ```

3. Restore tables from backups in new region

4. Update DNS/CloudFront to point to new region

5. Verify application functionality

**Recovery Time Objective (RTO)**: 4-8 hours

**Recovery Point Objective (RPO)**: 24 hours

### Scenario 5: Infrastructure Configuration Loss

**Use Case**: CDK stack deleted, infrastructure needs to be recreated

**Recovery Method**: CloudTrail logs + CDK code

**Steps**:

1. Review CloudTrail logs to understand what was deleted:
   ```bash
   aws cloudtrail lookup-events \
     --lookup-attributes AttributeKey=EventName,AttributeValue=DeleteStack \
     --max-results 50
   ```

2. Redeploy CDK stack:
   ```bash
   cdk deploy
   ```

3. Restore data from backups (see scenarios above)

4. Reconfigure application settings

5. Test all functionality

**Recovery Time Objective (RTO)**: 2-4 hours

**Recovery Point Objective (RPO)**: 0 seconds (infrastructure as code)

## Backup Verification

### Monthly Backup Testing

**Schedule**: First Monday of each month

**Procedure**:

1. Select a random backup from the previous month

2. Restore to a test table

3. Verify data integrity:
   - Record count matches expected
   - Sample records are complete and accurate
   - Indexes are functional

4. Document results

5. Delete test table

**Script**:
```bash
#!/bin/bash
# Monthly backup verification script

# List backups from last month
aws dynamodb list-backups \
  --table-name TaskManager-Tasks \
  --time-range-lower-bound $(date -d '1 month ago' +%s) \
  --time-range-upper-bound $(date +%s)

# Select random backup (manual selection for now)
BACKUP_ARN="arn:aws:dynamodb:us-east-1:123456789012:table/TaskManager-Tasks/backup/01234567890123-abcdefgh"

# Restore to test table
aws dynamodb restore-table-from-backup \
  --target-table-name TaskManager-Tasks-Test \
  --backup-arn "$BACKUP_ARN"

# Wait for restore
aws dynamodb wait table-exists --table-name TaskManager-Tasks-Test

# Verify record count
RECORD_COUNT=$(aws dynamodb scan \
  --table-name TaskManager-Tasks-Test \
  --select COUNT \
  --query 'Count' \
  --output text)

echo "Restored table has $RECORD_COUNT records"

# Sample 10 random records
aws dynamodb scan \
  --table-name TaskManager-Tasks-Test \
  --limit 10

# Delete test table
aws dynamodb delete-table --table-name TaskManager-Tasks-Test

echo "Backup verification complete"
```

### Quarterly Disaster Recovery Drill

**Schedule**: Quarterly (January, April, July, October)

**Procedure**:

1. Simulate complete data loss scenario

2. Restore all tables from backups

3. Verify application functionality

4. Measure RTO and RPO

5. Document lessons learned

6. Update procedures as needed

## Backup Monitoring

### CloudWatch Alarms

**Backup Failure Alarm**:
- Triggers when backup Lambda function fails
- Sends notification to SNS topic
- Requires immediate investigation

**Backup Duration Alarm**:
- Triggers if backup takes longer than expected
- May indicate table growth or performance issues

### Backup Metrics

Monitor the following metrics:

1. **Backup Success Rate**: Should be 100%
2. **Backup Duration**: Track trends over time
3. **Backup Size**: Monitor table growth
4. **Restore Test Success Rate**: Should be 100%

### Dashboard

Create a CloudWatch dashboard with:
- Backup success/failure count
- Backup duration trend
- Table size trend
- Last successful backup timestamp

## Backup Retention Policy

### On-Demand Backups

**Retention**: 30 days

**Cleanup**: Automated by backup Lambda function

**Exception**: Critical backups can be tagged for extended retention

### Point-in-Time Recovery

**Retention**: 35 days (AWS managed)

**Cannot be extended**: Use on-demand backups for longer retention

### CloudTrail Logs

**Retention**: 365 days

**Lifecycle Policy**: Transition to Glacier after 90 days

## Cost Considerations

### Backup Costs

**On-Demand Backups**:
- Storage: $0.10 per GB per month
- Restore: $0.15 per GB

**PITR**:
- Continuous backups: ~20% of table storage cost
- Restore: $0.15 per GB

**CloudTrail**:
- S3 storage: $0.023 per GB per month (Standard)
- Glacier: $0.004 per GB per month (after 90 days)

### Cost Optimization

1. **Adjust Retention**: Reduce to 14 days if 30 days is not required
2. **Selective Backups**: Don't backup ephemeral data (RateLimits table)
3. **Compress CloudTrail Logs**: Enable S3 compression
4. **Lifecycle Policies**: Move old logs to cheaper storage tiers

### Estimated Monthly Backup Costs

Assuming:
- Users table: 1 GB
- Tasks table: 5 GB
- Sessions table: 0.5 GB
- AuditLog table: 2 GB
- Total: 8.5 GB

**On-Demand Backups**: 8.5 GB × $0.10 = $0.85/month

**PITR**: 8.5 GB × $0.023 × 0.20 = $0.04/month

**CloudTrail**: 10 GB × $0.023 = $0.23/month

**Total Backup Cost**: ~$1.12/month

## Security Considerations

### Backup Encryption

- All backups are encrypted at rest using AWS-managed keys
- Consider using customer-managed KMS keys for additional control

### Access Control

- Backup operations require specific IAM permissions
- Restore operations should be restricted to authorized personnel
- Audit all backup and restore operations via CloudTrail

### Backup Integrity

- DynamoDB backups include checksums for integrity verification
- CloudTrail log file validation ensures logs haven't been tampered with
- Regular restore testing verifies backup integrity

## Compliance

### Regulatory Requirements

**GDPR**: 
- Backups may contain personal data
- Ensure backups are deleted when data retention period expires
- Implement right to erasure in backup procedures

**HIPAA** (if applicable):
- Encrypt backups with customer-managed keys
- Implement access logging for all backup operations
- Maintain backup audit trail

**SOC 2**:
- Document backup and recovery procedures
- Test recovery procedures regularly
- Maintain evidence of backup success

## Troubleshooting

### Backup Failures

**Symptom**: Backup Lambda function fails

**Possible Causes**:
- IAM permission issues
- Table doesn't exist
- Backup limit exceeded (50 concurrent backups per account)
- Service quota exceeded

**Resolution**:
1. Check Lambda logs in CloudWatch
2. Verify IAM permissions
3. Check DynamoDB service quotas
4. Retry backup manually

### Restore Failures

**Symptom**: Table restore fails or takes too long

**Possible Causes**:
- Insufficient IAM permissions
- Target table already exists
- Service quota exceeded
- Large table size

**Resolution**:
1. Check error message in AWS Console
2. Verify target table doesn't exist
3. Check service quotas
4. For large tables, expect longer restore times

### Data Inconsistency After Restore

**Symptom**: Restored data doesn't match expectations

**Possible Causes**:
- Wrong restore point selected
- Data was modified after backup
- Backup corruption (rare)

**Resolution**:
1. Verify restore timestamp
2. Check audit logs for data modifications
3. Try restoring from a different backup
4. Contact AWS Support if corruption suspected

## Emergency Contacts

### Internal

- **DevOps Team**: devops@example.com
- **Database Administrator**: dba@example.com
- **Security Team**: security@example.com

### External

- **AWS Support**: https://console.aws.amazon.com/support/
- **AWS Premium Support**: 1-800-xxx-xxxx (if applicable)

## Appendix

### Backup Lambda Function

Location: `lambda/backup-handler.ts`

Key Functions:
- `createBackup()`: Creates on-demand backup
- `deleteOldBackups()`: Removes backups older than 30 days
- `handler()`: Main Lambda handler

### Useful AWS CLI Commands

```bash
# List all backups
aws dynamodb list-backups

# Create manual backup
aws dynamodb create-backup \
  --table-name TaskManager-Tasks \
  --backup-name Manual-Backup-$(date +%Y%m%d)

# Describe backup
aws dynamodb describe-backup --backup-arn <arn>

# Delete backup
aws dynamodb delete-backup --backup-arn <arn>

# Check PITR status
aws dynamodb describe-continuous-backups \
  --table-name TaskManager-Tasks

# Enable PITR
aws dynamodb update-continuous-backups \
  --table-name TaskManager-Tasks \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

### Recovery Checklist

- [ ] Identify the recovery scenario
- [ ] Determine recovery point (timestamp or backup)
- [ ] Choose recovery method (PITR or backup restore)
- [ ] Notify stakeholders of recovery operation
- [ ] Execute restore procedure
- [ ] Verify data integrity
- [ ] Test application functionality
- [ ] Update DNS/configuration if needed
- [ ] Monitor for issues
- [ ] Document incident and recovery
- [ ] Conduct post-mortem
- [ ] Update procedures based on lessons learned

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-01-15 | DevOps Team | Initial version |

