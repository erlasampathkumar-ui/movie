# 🚀 CineRed AWS 3-Tier Enterprise Architecture Guide
## Deploying with S3 (Frontend), EC2 (Backend), VPC (Networking), and RDS (Database)

This comprehensive guide walks you through upgrading your CineRed Movie Ticket Booking application from a single EC2 instance into a production-grade **3-Tier AWS Architecture**:
- **Frontend Tier:** Hosted globally on **AWS S3** (Static Website Hosting / CloudFront)
- **Application Tier:** Running on **AWS EC2** (FastAPI REST API inside VPC Public Subnet)
- **Database Tier:** Running on **AWS RDS** (PostgreSQL / MySQL inside VPC Private Subnets)
- **Network Tier:** Custom **AWS VPC** with isolated public/private subnets and tight Security Group rules.

---

## 🏛️ System Architecture Diagram

```mermaid
flowchart TD
    subgraph Users ["🌐 Public Internet"]
        Browser["👤 User Web Browser"]
    end

    subgraph AWS_Cloud ["☁️ AWS Cloud Infrastructure"]
        subgraph Storage ["S3 Static Hosting / CloudFront"]
            S3["📦 AWS S3 Bucket\n(HTML5, CSS, JS, Assets)"]
        end

        subgraph VPC ["🛡️ CineRed Custom VPC (10.0.0.0/16)"]
            IGW["🚪 Internet Gateway"]
            
            subgraph Public_Subnet ["Public Subnet (10.0.1.0/24 - AZ A)"]
                EC2["🖥️ EC2 Instance\nFastAPI Backend (:8000)\nSecurity Group: ec2-backend-sg"]
            end

            subgraph Private_Subnets ["Private Subnets (10.0.11.0/24 & 10.0.12.0/24)"]
                DBSubnetGroup["🗄️ DB Subnet Group (AZ A + AZ B)"]
                RDS["🐘 AWS RDS PostgreSQL / MySQL\nSecurity Group: rds-db-sg\n(Port 5432 / 3306)"]
            end
        end
    end

    Browser -->|1. Loads Website UI| S3
    Browser -->|2. REST API Calls: /api/bookings| EC2
    EC2 -->|3. Queries / Saves Tickets (Internal Only)| RDS
    IGW --> EC2
    S3 -.->|Config points to EC2 IP| Browser
```

---

## ⚡ Option 1: 1-Click Provisioning via AWS CloudFormation (Fastest)

We have provided a production-ready CloudFormation template located at [`aws/cloudformation-vpc-rds.yml`](aws/cloudformation-vpc-rds.yml).

### Steps:
1. Open the [AWS CloudFormation Console](https://console.aws.amazon.com/cloudformation/).
2. Click **Create stack** > **With new resources (standard)**.
3. Choose **Upload a template file** and select `aws/cloudformation-vpc-rds.yml`.
4. Enter Stack name: `cinered-infrastructure`.
5. Enter your desired **DBPassword** (e.g. `CineRedPass2026!`).
6. Click **Next** -> **Next** -> **Submit**.
7. In ~5 to 8 minutes, AWS will automatically provision:
   - Custom VPC with Internet Gateway & Route Tables
   - 2 Public Subnets & 2 Private Subnets (Multi-AZ)
   - EC2 & RDS Security Groups (pre-configured)
   - RDS PostgreSQL Database instance
8. Check the **Outputs** tab for:
   - `RDSEndpoint` (Host address, e.g. `cinered-postgres-db.xxxx.us-east-1.rds.amazonaws.com`)
   - `PublicSubnet1Id` (Where to launch/attach EC2)
   - `EC2SecurityGroupId`

---

## 🛠️ Option 2: Step-by-Step Manual Setup (AWS Console)

If you prefer building each component manually via the AWS Console, follow these steps:

---

### Step 1: Create the Custom VPC & Subnets

1. **Create VPC:**
   - Go to **VPC Console** > **Create VPC**.
   - Select **VPC only**.
   - Name tag: `CineRed-VPC`
   - IPv4 CIDR block: `10.0.0.0/16`
   - Click **Create VPC**.
   - Select the VPC > **Actions** > **Edit VPC settings** > Enable **DNS hostnames** & **DNS resolution**.

2. **Create Internet Gateway:**
   - Go to **Internet Gateways** > **Create internet gateway** (`CineRed-IGW`).
   - Select it > **Actions** > **Attach to VPC** > choose `CineRed-VPC`.

3. **Create Subnets (Across 2 Availability Zones):**
   - **Public Subnet 1 (AZ A):** CIDR `10.0.1.0/24`, AZ `us-east-1a` (Enable auto-assign public IPv4).
   - **Public Subnet 2 (AZ B):** CIDR `10.0.2.0/24`, AZ `us-east-1b` (Enable auto-assign public IPv4).
   - **Private Subnet 1 (AZ A):** CIDR `10.0.11.0/24`, AZ `us-east-1a`.
   - **Private Subnet 2 (AZ B):** CIDR `10.0.12.0/24`, AZ `us-east-1b`.

4. **Configure Route Tables:**
   - Create Route Table: `CineRed-Public-RT` in `CineRed-VPC`.
   - Edit Routes > Add Route: Destination `0.0.0.0/0` -> Target `Internet Gateway` (`CineRed-IGW`).
   - Subnet Associations > Associate `Public Subnet 1` and `Public Subnet 2`.

---

### Step 2: Configure Security Groups (Zero-Trust Model)

1. **EC2 Security Group (`CineRed-EC2-SG`):**
   - Inbound Rules:
     - `HTTP` (Port 80) from `0.0.0.0/0`
     - `Custom TCP` (Port 8000 - Backend API) from `0.0.0.0/0`
     - `SSH` (Port 22) from `My IP` (for administrative terminal access)

2. **RDS Database Security Group (`CineRed-RDS-SG`):**
   - Inbound Rules:
     - `PostgreSQL` (Port 5432) OR `MySQL` (Port 3306) -> Source: **Select `CineRed-EC2-SG`** (Do NOT allow `0.0.0.0/0`).
     - *This guarantees the database is isolated and only accessible from your EC2 backend.*

---

### Step 3: Create the AWS RDS Database

1. Go to **RDS Console** > **Subnet groups** > **Create DB Subnet Group**:
   - Name: `cinered-db-subnets`
   - VPC: `CineRed-VPC`
   - Add Subnets: Select `Private Subnet 1` and `Private Subnet 2`.
   - Click **Create**.

2. **Create Database:**
   - Engine: **PostgreSQL** (or MySQL)
   - Template: **Free Tier**
   - DB instance identifier: `cinered-postgres-db`
   - Master username: `postgres`
   - Master password: `YourStrongPassword123!`
   - DB instance class: `db.t3.micro` or `db.t4g.micro`
   - Storage: 20 GiB (gp2 or gp3)
   - Connectivity:
     - VPC: `CineRed-VPC`
     - DB Subnet Group: `cinered-db-subnets`
     - Public access: **No** (Secure!)
     - VPC Security group: Select `CineRed-RDS-SG`
   - Additional Configuration > Initial database name: `cinered`
   - Click **Create database**.
   - *Wait ~5-7 minutes. Once status is "Available", copy the **Endpoint** address.*

---

### Step 4: Run the Backend on your EC2 Instance

1. **Connect to your EC2 instance via SSH:**
   ```bash
   ssh -i "your-key.pem" ec2-user@<EC2-PUBLIC-IP>
   ```

2. **Install Python & Git (if not already installed):**
   ```bash
   # Amazon Linux 2023:
   sudo dnf update -y
   sudo dnf install -y python3-pip git postgresql15

   # Ubuntu:
   # sudo apt update && sudo apt install -y python3-pip git postgresql-client
   ```

3. **Clone the CineRed repository:**
   ```bash
   git clone https://github.com/erlasampathkumar-ui/movie.git
   cd movie/backend
   pip3 install -r requirements.txt
   ```

4. **Set Environment Variables for RDS and Start the API:**
   ```bash
   export DB_HOST="<YOUR-RDS-ENDPOINT-FROM-STEP-3>"
   export DB_PORT="5432"
   export DB_NAME="cinered"
   export DB_USER="postgres"
   export DB_PASSWORD="YourStrongPassword123!"

   # Run FastAPI server in the background (or use systemd)
   nohup python3 -m uvicorn app:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
   ```

5. **Test the Backend:**
   In your browser or curl:
   ```bash
   curl http://<EC2-PUBLIC-IP>:8000/health
   # Response: {"status":"ok","database":"connected","service":"CineRed Backend API on AWS EC2"}
   ```

---

### Step 5: Deploy Frontend to AWS S3 Static Website Hosting

1. **Update `config.js` with your EC2 API URL:**
   Open [`config.js`](config.js) on your computer:
   ```javascript
   window.CONFIG = {
     API_URL: "http://<YOUR-EC2-PUBLIC-IP>:8000"
   };
   ```

2. **Deploy to S3:**
   **Using PowerShell (Windows):**
   ```powershell
   .\aws\deploy-s3.ps1 -BucketName "cinered-movie-booking-prod-$(Get-Random)"
   ```

   **Using Bash (Linux / Mac / Git Bash):**
   ```bash
   chmod +x ./aws/deploy-s3.sh
   ./aws/deploy-s3.sh cinered-movie-booking-prod-$RANDOM
   ```

3. **Manual S3 Setup (Alternative):**
   - S3 Console > Create bucket with unique name (e.g. `cinered-movie-tickets-2026`).
   - Permissions > Uncheck **Block all public access** > Save.
   - Properties > Scroll to **Static website hosting** > Edit > Enable:
     - Index document: `index.html`
     - Error document: `index.html`
   - Permissions > **Bucket Policy** > Edit > Paste:
     ```json
     {
       "Version": "2012-10-17",
       "Statement": [
         {
           "Sid": "PublicReadGetObject",
           "Effect": "Allow",
           "Principal": "*",
           "Action": "s3:GetObject",
           "Resource": "arn:aws:s3:::<YOUR-BUCKET-NAME>/*"
         }
       ]
     }
     ```
   - Upload all frontend files (`index.html`, `config.js`, `css/`, `js/`, `assets/`) to the bucket root.

---

## 🎯 Verification & Testing Checklist

- [ ] **S3 Frontend:** Open your S3 Website Endpoint (e.g. `http://<bucket-name>.s3-website-us-east-1.amazonaws.com`). Check that the Black & Red UI, Devara, and Aravinda Sametha posters load cleanly.
- [ ] **Seat Selection:** Select showtime, pick seats on the interactive matrix, and proceed to payment.
- [ ] **RDS Sync:** Confirm the booking. You will see the toast: *"Booking synced with AWS RDS Database!"*.
- [ ] **Profile Check:** Click on your profile pill. Verify that the newly booked ticket appears under **Previous Movie Bookings** with full details and printable QR code!
- [ ] **Database Inspection (Optional):** Run on your EC2:
  ```bash
  psql -h <RDS-ENDPOINT> -U postgres -d cinered -c "SELECT booking_id, movie_id, seats, total_paid FROM bookings;"
  ```
