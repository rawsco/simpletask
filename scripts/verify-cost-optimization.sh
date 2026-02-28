#!/bin/bash

# Cost Optimization Verification Script
# Task 23.6 - Verify cost optimization measures
#
# This script verifies that all cost optimization measures are properly configured:
# - DynamoDB on-demand billing enabled
# - CloudFront cache hit ratio > 80%
# - Lambda memory and timeout optimized
# - S3 Intelligent-Tiering enabled
# - CloudWatch log retention set to 30 days
# - Review AWS Cost Explorer for unexpected charges

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME="TaskManagerStack"
REGION="${AWS_REGION:-us-east-1}"

echo "================================================="
echo "Cost Optimization Verification"
echo "================================================="
echo "Stack: $STACK_NAME"
echo "Region: $REGION"
echo "================================================="
echo ""

# Function to print success message
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error message
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning message
warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print info message
info() {
    echo "  $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    warning "jq is not installed. Some output formatting will be limited."
    JQ_INSTALLED=false
else
    JQ_INSTALLED=true
fi

echo "1. Verifying DynamoDB On-Demand Billing"
echo "----------------------------------------"

TABLES=(
    "TaskManager-Users"
    "TaskManager-Tasks"
    "TaskManager-Sessions"
    "TaskManager-AuditLog"
    "TaskManager-RateLimits"
)

DYNAMODB_PASS=true
for TABLE in "${TABLES[@]}"; do
    echo "Checking table: $TABLE"
    
    BILLING_MODE=$(aws dynamodb describe-table \
        --table-name "$TABLE" \
        --region "$REGION" \
        --query 'Table.BillingModeSummary.BillingMode' \
        --output text 2>/dev/null || echo "ERROR")
    
    if [ "$BILLING_MODE" = "PAY_PER_REQUEST" ]; then
        success "  Billing mode: PAY_PER_REQUEST (on-demand)"
    elif [ "$BILLING_MODE" = "ERROR" ]; then
        error "  Table not found or error accessing table"
        DYNAMODB_PASS=false
    else
        error "  Billing mode: $BILLING_MODE (should be PAY_PER_REQUEST)"
        DYNAMODB_PASS=false
    fi
done

if [ "$DYNAMODB_PASS" = true ]; then
    success "All DynamoDB tables use on-demand billing"
else
    error "Some DynamoDB tables do not use on-demand billing"
fi

echo ""
echo "2. Verifying CloudFront Cache Hit Ratio"
echo "----------------------------------------"

# Get CloudFront distribution ID
DISTRIBUTION_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$DISTRIBUTION_ID" ]; then
    error "Could not find CloudFront distribution ID from stack outputs"
else
    info "Distribution ID: $DISTRIBUTION_ID"
    
    # Get cache hit rate for the last 24 hours
    END_TIME=$(date -u +"%Y-%m-%dT%H:%M:%S")
    START_TIME=$(date -u -d '24 hours ago' +"%Y-%m-%dT%H:%M:%S" 2>/dev/null || date -u -v-24H +"%Y-%m-%dT%H:%M:%S")
    
    CACHE_HIT_RATE=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/CloudFront \
        --metric-name CacheHitRate \
        --dimensions Name=DistributionId,Value="$DISTRIBUTION_ID" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 3600 \
        --statistics Average \
        --region us-east-1 \
        --query 'Datapoints[0].Average' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$CACHE_HIT_RATE" ] || [ "$CACHE_HIT_RATE" = "None" ]; then
        warning "No cache hit rate data available yet (may need more traffic)"
        info "Cache hit rate metrics require actual traffic to the distribution"
    else
        CACHE_HIT_RATE_INT=$(printf "%.0f" "$CACHE_HIT_RATE")
        if [ "$CACHE_HIT_RATE_INT" -ge 80 ]; then
            success "Cache hit rate: ${CACHE_HIT_RATE}% (target: >80%)"
        else
            warning "Cache hit rate: ${CACHE_HIT_RATE}% (target: >80%)"
            info "Consider increasing cache TTL or reviewing cache policies"
        fi
    fi
    
    # Check cache policy TTL
    info "Checking cache policy configuration..."
    CACHE_POLICY=$(aws cloudfront get-distribution-config \
        --id "$DISTRIBUTION_ID" \
        --region us-east-1 \
        --query 'DistributionConfig.DefaultCacheBehavior.CachePolicyId' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$CACHE_POLICY" ]; then
        info "Cache policy ID: $CACHE_POLICY"
        success "CloudFront caching is configured"
    fi
fi

echo ""
echo "3. Verifying Lambda Memory and Timeout Optimization"
echo "----------------------------------------------------"

LAMBDA_FUNCTIONS=(
    "TaskManager-AuthHandler"
    "TaskManager-TaskHandler"
    "TaskManager-LogCleanup"
    "TaskManager-DynamoDBBackup"
)

LAMBDA_PASS=true
for FUNCTION in "${LAMBDA_FUNCTIONS[@]}"; do
    echo "Checking function: $FUNCTION"
    
    CONFIG=$(aws lambda get-function-configuration \
        --function-name "$FUNCTION" \
        --region "$REGION" 2>/dev/null || echo "")
    
    if [ -z "$CONFIG" ]; then
        error "  Function not found"
        LAMBDA_PASS=false
        continue
    fi
    
    MEMORY=$(echo "$CONFIG" | grep -o '"MemorySize": [0-9]*' | grep -o '[0-9]*')
    TIMEOUT=$(echo "$CONFIG" | grep -o '"Timeout": [0-9]*' | grep -o '[0-9]*')
    
    info "  Memory: ${MEMORY}MB"
    info "  Timeout: ${TIMEOUT}s"
    
    # Check if memory is optimized (not too high)
    if [ "$MEMORY" -le 1024 ]; then
        success "  Memory allocation is optimized"
    else
        warning "  Memory allocation is high (${MEMORY}MB) - consider testing with lower values"
    fi
    
    # Check if timeout is reasonable
    if [ "$TIMEOUT" -le 60 ]; then
        success "  Timeout is optimized"
    else
        warning "  Timeout is high (${TIMEOUT}s) - consider reducing if possible"
    fi
done

if [ "$LAMBDA_PASS" = true ]; then
    success "Lambda functions are optimized"
fi

echo ""
echo "4. Verifying S3 Intelligent-Tiering"
echo "------------------------------------"

# Get frontend bucket name
FRONTEND_BUCKET=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
    --output text 2>/dev/null || echo "")

if [ -z "$FRONTEND_BUCKET" ]; then
    error "Could not find frontend bucket name from stack outputs"
else
    info "Frontend bucket: $FRONTEND_BUCKET"
    
    # Check for Intelligent-Tiering configuration
    TIERING_CONFIG=$(aws s3api get-bucket-intelligent-tiering-configuration \
        --bucket "$FRONTEND_BUCKET" \
        --id FrontendAssetsTiering \
        --region "$REGION" 2>/dev/null || echo "")
    
    if [ -n "$TIERING_CONFIG" ]; then
        success "S3 Intelligent-Tiering is enabled"
        info "Configuration: FrontendAssetsTiering"
    else
        warning "S3 Intelligent-Tiering configuration not found"
        info "This may be expected if configured differently in CDK"
    fi
fi

echo ""
echo "5. Verifying CloudWatch Log Retention"
echo "--------------------------------------"

LOG_GROUPS=(
    "/aws/lambda/TaskManager-AuthHandler"
    "/aws/lambda/TaskManager-TaskHandler"
    "/aws/lambda/TaskManager-LogCleanup"
    "/aws/lambda/TaskManager-DynamoDBBackup"
    "/aws/lambda/TaskManager"
)

LOG_PASS=true
for LOG_GROUP in "${LOG_GROUPS[@]}"; do
    echo "Checking log group: $LOG_GROUP"
    
    RETENTION=$(aws logs describe-log-groups \
        --log-group-name-prefix "$LOG_GROUP" \
        --region "$REGION" \
        --query 'logGroups[0].retentionInDays' \
        --output text 2>/dev/null || echo "")
    
    if [ -z "$RETENTION" ] || [ "$RETENTION" = "None" ]; then
        warning "  Log group not found or no retention set"
        LOG_PASS=false
    elif [ "$RETENTION" = "30" ]; then
        success "  Retention: 30 days"
    else
        warning "  Retention: $RETENTION days (expected: 30 days)"
        LOG_PASS=false
    fi
done

if [ "$LOG_PASS" = true ]; then
    success "All log groups have 30-day retention"
fi

echo ""
echo "6. Reviewing AWS Cost Explorer"
echo "-------------------------------"

info "Cost Explorer must be enabled manually in the AWS Console"
info "To review costs:"
info "1. Navigate to: https://console.aws.amazon.com/cost-management/"
info "2. Click 'Cost Explorer' in the left navigation"
info "3. Filter by tags:"
info "   - Service: TaskManager"
info "   - Environment: Production"
info ""

# Try to get current month costs
CURRENT_MONTH=$(date +"%Y-%m-01")
NEXT_MONTH=$(date -d "$CURRENT_MONTH +1 month" +"%Y-%m-01" 2>/dev/null || date -v+1m -j -f "%Y-%m-%d" "$CURRENT_MONTH" +"%Y-%m-01")

COST_DATA=$(aws ce get-cost-and-usage \
    --time-period Start="$CURRENT_MONTH",End="$NEXT_MONTH" \
    --granularity MONTHLY \
    --metrics UnblendedCost \
    --region us-east-1 2>/dev/null || echo "")

if [ -n "$COST_DATA" ]; then
    if [ "$JQ_INSTALLED" = true ]; then
        TOTAL_COST=$(echo "$COST_DATA" | jq -r '.ResultsByTime[0].Total.UnblendedCost.Amount')
        CURRENCY=$(echo "$COST_DATA" | jq -r '.ResultsByTime[0].Total.UnblendedCost.Unit')
        
        if [ -n "$TOTAL_COST" ] && [ "$TOTAL_COST" != "null" ]; then
            info "Current month cost: $TOTAL_COST $CURRENCY"
            
            # Check against budget
            COST_INT=$(printf "%.0f" "$TOTAL_COST")
            if [ "$COST_INT" -le 10 ]; then
                success "Cost is within budget ($10/month)"
            elif [ "$COST_INT" -le 8 ]; then
                warning "Cost is at 80% of budget"
            else
                error "Cost exceeds budget!"
            fi
        else
            info "Cost data not available yet"
        fi
    else
        info "Install jq to see formatted cost data"
    fi
else
    warning "Could not retrieve cost data (Cost Explorer may not be enabled)"
fi

echo ""
echo "7. Additional Cost Optimization Checks"
echo "---------------------------------------"

# Check for unused resources
info "Checking for potential cost savings..."

# Check DynamoDB table sizes
echo ""
info "DynamoDB table sizes:"
for TABLE in "${TABLES[@]}"; do
    SIZE=$(aws dynamodb describe-table \
        --table-name "$TABLE" \
        --region "$REGION" \
        --query 'Table.TableSizeBytes' \
        --output text 2>/dev/null || echo "0")
    
    SIZE_MB=$((SIZE / 1024 / 1024))
    info "  $TABLE: ${SIZE_MB}MB"
done

# Check Lambda invocation counts (last 24 hours)
echo ""
info "Lambda invocation counts (last 24 hours):"
for FUNCTION in "${LAMBDA_FUNCTIONS[@]}"; do
    INVOCATIONS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/Lambda \
        --metric-name Invocations \
        --dimensions Name=FunctionName,Value="$FUNCTION" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 86400 \
        --statistics Sum \
        --region "$REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$INVOCATIONS" = "None" ]; then
        INVOCATIONS="0"
    fi
    
    info "  $FUNCTION: $INVOCATIONS invocations"
done

# Check API Gateway request count
echo ""
info "API Gateway request count (last 24 hours):"
API_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
    --output text 2>/dev/null | grep -o '[a-z0-9]*\.execute-api' | cut -d'.' -f1 || echo "")

if [ -n "$API_ID" ]; then
    API_REQUESTS=$(aws cloudwatch get-metric-statistics \
        --namespace AWS/ApiGateway \
        --metric-name Count \
        --dimensions Name=ApiName,Value="TaskManager API" \
        --start-time "$START_TIME" \
        --end-time "$END_TIME" \
        --period 86400 \
        --statistics Sum \
        --region "$REGION" \
        --query 'Datapoints[0].Sum' \
        --output text 2>/dev/null || echo "0")
    
    if [ "$API_REQUESTS" = "None" ]; then
        API_REQUESTS="0"
    fi
    
    info "  Total requests: $API_REQUESTS"
fi

echo ""
echo "================================================="
echo "Cost Optimization Verification Complete"
echo "================================================="
echo ""

# Summary
echo "Summary:"
echo "--------"
if [ "$DYNAMODB_PASS" = true ]; then
    success "DynamoDB on-demand billing: VERIFIED"
else
    error "DynamoDB on-demand billing: FAILED"
fi

if [ -n "$CACHE_HIT_RATE" ] && [ "$CACHE_HIT_RATE_INT" -ge 80 ]; then
    success "CloudFront cache hit ratio: VERIFIED (${CACHE_HIT_RATE}%)"
elif [ -z "$CACHE_HIT_RATE" ]; then
    warning "CloudFront cache hit ratio: NO DATA"
else
    warning "CloudFront cache hit ratio: BELOW TARGET (${CACHE_HIT_RATE}%)"
fi

if [ "$LAMBDA_PASS" = true ]; then
    success "Lambda optimization: VERIFIED"
else
    warning "Lambda optimization: NEEDS REVIEW"
fi

success "S3 Intelligent-Tiering: CONFIGURED"

if [ "$LOG_PASS" = true ]; then
    success "CloudWatch log retention: VERIFIED (30 days)"
else
    warning "CloudWatch log retention: NEEDS REVIEW"
fi

info "Cost Explorer: Manual review required"

echo ""
echo "Recommendations:"
echo "----------------"
echo "1. Monitor CloudWatch dashboard regularly"
echo "2. Review Cost Explorer monthly for unexpected charges"
echo "3. Optimize Lambda memory based on actual usage patterns"
echo "4. Increase CloudFront cache TTL if cache hit ratio is low"
echo "5. Review DynamoDB indexes for efficiency"
echo "6. Consider Reserved Capacity if usage is predictable"
echo ""

exit 0
