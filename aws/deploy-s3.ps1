# ==============================================================================
# CineRed - AWS S3 Static Website Hosting Deployment (PowerShell)
# ==============================================================================
# Usage:
#   .\aws\deploy-s3.ps1 -BucketName "cinered-movie-app-unique-12345" [-Region "us-east-1"]
# ==============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$BucketName,
    
    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Red
Write-Host "🎬 Deploying CineRed Frontend to AWS S3 Static Website Hosting" -ForegroundColor Yellow
Write-Host "Bucket: $BucketName (Region: $Region)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Red

# 1. Create S3 Bucket
Write-Host "📦 Creating / Verifying S3 Bucket: $BucketName..." -ForegroundColor Cyan
if ($Region -eq "us-east-1") {
    aws s3api create-bucket --bucket "$BucketName" --region "$Region" 2>$null
} else {
    aws s3api create-bucket --bucket "$BucketName" --region "$Region" --create-bucket-configuration LocationConstraint="$Region" 2>$null
}

# 2. Disable Block Public Access (Required for S3 Website Hosting)
Write-Host "🔓 Configuring Public Access permissions..." -ForegroundColor Cyan
aws s3api put-public-access-block --bucket "$BucketName" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

# 3. Enable Static Website Hosting
Write-Host "🌐 Enabling Static Website Hosting..." -ForegroundColor Cyan
aws s3api put-bucket-website --bucket "$BucketName" --website-configuration '{\"IndexDocument\":{\"Suffix\":\"index.html\"},\"ErrorDocument\":{\"Key\":\"index.html\"}}'

# 4. Apply Public Read Bucket Policy
Write-Host "📜 Applying Public Read Policy..." -ForegroundColor Cyan
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@
$policyFile = [System.IO.Path]::GetTempFileName()
Set-Content -Path $policyFile -Value $policy
aws s3api put-bucket-policy --bucket "$BucketName" --policy "file://$policyFile"
Remove-Item -Path $policyFile -Force

# 5. Sync Frontend Code to S3
Write-Host "🚀 Uploading CineRed static assets to S3..." -ForegroundColor Cyan
aws s3 sync . "s3://$BucketName" `
    --exclude ".git/*" `
    --exclude ".github/*" `
    --exclude "backend/*" `
    --exclude "aws/*" `
    --exclude "*.md" `
    --exclude "*.ps1" `
    --exclude "*.sh" `
    --exclude "Dockerfile" `
    --exclude "docker-compose.yml" `
    --exclude "nginx.conf" `
    --exclude "amplify.yml" `
    --delete

$websiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"
if ($Region -eq "us-east-1") {
    $websiteUrl = "http://$BucketName.s3-website-us-east-1.amazonaws.com"
}

Write-Host "============================================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS! CineRed Frontend is LIVE on AWS S3:" -ForegroundColor Green
Write-Host "👉 $websiteUrl" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
