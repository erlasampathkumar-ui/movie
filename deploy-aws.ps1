# ==============================================================================
# CineRed - AWS S3 + CloudFront Deployment Script (PowerShell)
# ==============================================================================
# Usage:
#   .\deploy-aws.ps1 -BucketName "your-s3-bucket-name" [-DistributionId "E1234EXAMPLE"]
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BucketName,
    
    [Parameter(Mandatory=$false)]
    [string]$DistributionId
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deploying CineRed Movie App to AWS S3: s3://$BucketName..." -ForegroundColor Cyan

# Sync files to S3 bucket
aws s3 sync . "s3://$BucketName" `
    --exclude ".git/*" `
    --exclude ".github/*" `
    --exclude "*.md" `
    --exclude "*.sh" `
    --exclude "*.ps1" `
    --exclude "Dockerfile" `
    --exclude "docker-compose.yml" `
    --exclude "nginx.conf" `
    --exclude "amplify.yml" `
    --delete

Write-Host "✅ S3 sync completed successfully!" -ForegroundColor Green

# Invalidate CloudFront cache if provided
if ($DistributionId) {
    Write-Host "🔄 Invalidating CloudFront cache for distribution: $DistributionId..." -ForegroundColor Yellow
    aws cloudfront create-invalidation --distribution-id $DistributionId --paths "/*"
    Write-Host "✅ CloudFront cache invalidation initiated!" -ForegroundColor Green
}

Write-Host "🎉 Deployment finished!" -ForegroundColor Green
