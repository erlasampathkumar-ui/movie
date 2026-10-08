#!/usr/bin/env bash
# ==============================================================================
# CineRed - AWS S3 + CloudFront Deployment Script
# ==============================================================================
# Usage:
#   chmod +x deploy-aws.sh
#   ./deploy-aws.sh <your-s3-bucket-name> [optional-cloudfront-distribution-id]
# ==============================================================================

set -e

BUCKET_NAME=$1
DISTRIBUTION_ID=$2

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Error: Please provide your AWS S3 bucket name."
  echo "Usage: ./deploy-aws.sh <your-s3-bucket-name> [cloudfront-distribution-id]"
  exit 1
fi

echo "🚀 Deploying CineRed Movie App to AWS S3: s3://${BUCKET_NAME}..."

# Sync files to S3 bucket with optimal cache headers
aws s3 sync . "s3://${BUCKET_NAME}" \
  --exclude ".git/*" \
  --exclude ".github/*" \
  --exclude "*.md" \
  --exclude "*.sh" \
  --exclude "*.ps1" \
  --exclude "Dockerfile" \
  --exclude "docker-compose.yml" \
  --exclude "nginx.conf" \
  --exclude "amplify.yml" \
  --delete

echo "✅ S3 sync completed successfully!"

# Invalidate CloudFront cache if distribution ID is provided
if [ -n "$DISTRIBUTION_ID" ]; then
  echo "🔄 Invalidating CloudFront cache for Distribution: ${DISTRIBUTION_ID}..."
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/*"
  echo "✅ CloudFront cache invalidation triggered!"
fi

echo "🎉 Deployment to AWS completed!"
