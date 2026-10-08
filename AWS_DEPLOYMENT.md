# 🎬 CineRed - AWS Deployment & Git Setup Guide

This guide details how to push this repository to Git (GitHub/GitLab/CodeCommit) and deploy **CineRed Movie Ticket Booking App** to **AWS**.

---

## 📌 Table of Contents
1. [Pushing to Git (GitHub / GitLab / AWS CodeCommit)](#1-pushing-to-git)
2. [Option A: Deploy via AWS Amplify (Fastest & 1-Click CI/CD)](#option-a-deploy-via-aws-amplify-recommended)
3. [Option B: Deploy via AWS S3 + CloudFront (High Performance CDN)](#option-b-deploy-via-aws-s3--cloudfront)
4. [Option C: Deploy via AWS EC2 (Docker or Nginx)](#option-c-deploy-via-aws-ec2-docker)
5. [Option D: Automated CI/CD via GitHub Actions](#option-d-automated-cicd-with-github-actions)

---

## 1. Pushing to Git

### Initialize and Push to Remote:
```bash
# 1. Check git status
git status

# 2. Add your remote repository URL (replace with your repo)
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git

# 3. Rename branch to main if needed
git branch -M main

# 4. Push to remote
git push -u origin main
```

---

## Option A: Deploy via AWS Amplify (Recommended)

AWS Amplify is the easiest method for hosting static single-page web applications with automatic SSL, custom domains, and instant global CDN.

1. Open the [AWS Amplify Console](https://console.aws.amazon.com/amplify/).
2. Click **Host web app**.
3. Select **GitHub** (or CodeCommit / GitLab) and authorize your account.
4. Select your repository: `cinered-movie-app` and branch `main`.
5. Amplify will automatically detect `amplify.yml`.
6. Click **Save and Deploy**.
7. In ~2 minutes, your website will be live at `https://main.xxxxxx.amplifyapp.com`.

---

## Option B: Deploy via AWS S3 + CloudFront

### Step 1: Create an S3 Bucket
```bash
aws s3 mb s3://cinered-movie-booking-app --region us-east-1
```

### Step 2: Enable Static Website Hosting
```bash
aws s3 website s3://cinered-movie-booking-app/ --index-document index.html --error-document index.html
```

### Step 3: Set Bucket Policy for Public Read Access
Create `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::cinered-movie-booking-app/*"
    }
  ]
}
```
Apply the policy:
```bash
aws s3api put-bucket-policy --bucket cinered-movie-booking-app --policy file://bucket-policy.json
```

### Step 4: Deploy using the Included Script
**Linux / macOS / Git Bash:**
```bash
chmod +x deploy-aws.sh
./deploy-aws.sh cinered-movie-booking-app
```

**Windows PowerShell:**
```powershell
.\deploy-aws.ps1 -BucketName "cinered-movie-booking-app"
```

---

## Option C: Deploy via AWS EC2 (Docker)

### Step 1: Launch an EC2 Instance (Amazon Linux 2023 or Ubuntu)
- Security Group: Allow HTTP (port 80) and HTTPS (port 443).

### Step 2: Connect to EC2 via SSH
```bash
ssh -i "your-key.pem" ec2-user@<EC2-PUBLIC-IP>
```

### Step 3: Install Docker & Git
```bash
sudo yum update -y
sudo yum install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

### Step 4: Clone & Run Container
```bash
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
cd <YOUR_REPO_NAME>
docker compose up -d --build
```
Your app is now running at `http://<EC2-PUBLIC-IP>`!

---

## Option D: Automated CI/CD with GitHub Actions

The repository includes `.github/workflows/deploy-aws.yml`.

To enable automatic continuous deployment on every `git push`:
1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Add the following secrets:
   - `AWS_ACCESS_KEY_ID`: Your IAM user access key
   - `AWS_SECRET_ACCESS_KEY`: Your IAM secret access key
   - `AWS_S3_BUCKET_NAME`: Your target bucket name (e.g. `cinered-movie-booking-app`)
   - `CLOUDFRONT_DISTRIBUTION_ID`: (Optional) Your CloudFront distribution ID for cache invalidation.
3. Every push to `main` branch will automatically update your live site!
