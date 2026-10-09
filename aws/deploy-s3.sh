#!/usr/bin/env bash
# ==============================================================================
# CineRed - AWS S3 Static Website Hosting Deployment (Bash)
# ==============================================================================
# Usage:
#   chmod +x ./aws/deploy-s3.sh
#   ./aws/deploy-s3.sh <bucket-name> [region]
# ==============================================================================

set -e

BUCKET_NAME=$1
REGION=${2:-"us-east-1"}

if [ -z "$BUCKET_NAME" ]; then
  echo "❌ Error: Bucket name is required."
  echo "Usage: ./aws/deploy-s3.sh <unique-bucket-name> [region]"
  exit 1
fi

echo "🎬 Deploying CineRed to S3: s3://${BUCKET_NAME} in ${REGION}..."

# 1. Create S3 Bucket
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" 2>/dev/null || true
else
  aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null || true
fi

# 2. Disable Block Public Access
echo "🔓 Disabling block public access..."
aws s3api put-public-access-block --bucket "$BUCKET_NAME" \
  --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 3. Enable Static Website Hosting
echo "🌐 Enabling website hosting..."
aws s3api put-bucket-website --bucket "$BUCKET_NAME" \
  --website-configuration '{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}'

# 4. Apply Public Read Policy
echo "📜 Applying public policy..."
POLICY=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    }
  ]
}
EOF
)
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --policy "$POLICY"

# 5. Sync Assets
echo "🚀 Syncing files..."
aws s3 sync . "s3://${BUCKET_NAME}" \
  --exclude ".git/*" \
  --exclude ".github/*" \
  --exclude "backend/*" \
  --exclude "aws/*" \
  --exclude "*.md" \
  --exclude "*.ps1" \
  --exclude "*.sh" \
  --exclude "Dockerfile" \
  --exclude "docker-compose.yml" \
  --exclude "nginx.conf" \
  --exclude "amplify.yml" \
  --delete

WEBSITE_URL="http://${BUCKET_NAME}.s3-website-${REGION}.amazonaws.com"
echo "🎉 SUCCESS! Your app is LIVE at: ${WEBSITE_URL}"
