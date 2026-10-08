# 🎬 CineRed - Premium Black & Red Movie Ticket Booking Application

[![Theme](https://img.shields.io/badge/Theme-Black%20%26%20Crimson%20Red-e50914.svg)](#)
[![Movies](https://img.shields.io/badge/Featured-Devara%20%7C%20Aravinda%20Sametha-ff2a3b.svg)](#)
[![AWS Ready](https://img.shields.io/badge/AWS-S3%20%7C%20Amplify%20%7C%20EC2%20Docker-232f3e.svg)](#)

A high-performance, user-friendly movie ticket booking web application crafted with a cinematic **black and red aesthetic**. Features real-time seat filling speed indicators, interactive tiered seat matrix selection prior to payment, simulated multi-channel checkout (UPI QR / Card / NetBanking), digital ticket generation with canvas QR codes, and persistent user profile with previous booking history.

---

## 🌟 Key Highlights & Feature Matrix

### 1. 🖤 Black and Crimson Red Cinematic Theme
- Designed with deep pitch black backgrounds (`#08080a`, `#15151c`), dark glassmorphism modals with backdrop-filter blur, and neon crimson red glow accents (`#e50914`, `#ff2a3b`).
- Glowing interactive CTA buttons, curved cinema screen glow, and polished micro-interactions.

### 2. 📽️ Featured Blockbusters: *Devara* & *Aravinda Sametha*
- **Devara: Part 1** (Starring Jr. NTR, Janhvi Kapoor, Saif Ali Khan; Music by Anirudh Ravichander; Dir. Koratala Siva).
- **Aravinda Sametha Veera Raghava** (Starring Jr. NTR, Pooja Hegde, Jagapathi Babu; Music by Thaman S; Dir. Trivikram Srinivas).
- Theatrical posters downloaded from verified archives with high-res responsive banners, genre badges, cast details, synopsis, and HD trailer preview modals.

### 3. ⚡ Live Seat Filling Speed Indicator (Near Movie Posters & Logos)
- Real-time animated **"Filling Fast! 🔥 88% Booked"** and **"Almost Full! ⚡ 94% Booked"** heat gauges.
- Animated pulsating neon progress bar and live velocity ticker (e.g., *"⚡ 26 seats booked in the last 15 minutes"*).

### 4. 💺 Interactive Seat Selection BEFORE Payment Option
- **Step 1:** Showtime & Cinema selection (PVR IMAX Nexus Mall, AMB Cinemas VIP, Prasads Multiplex, Cinépolis).
- **Step 2: Interactive Seat Matrix:**
  - Curved glowing Cinema Screen: *"All eyes this way • CINEMA SCREEN"*.
  - Tiered seating:
    - **Platinum Recliner** (₹350) - Top rows A, B
    - **Gold Prime** (₹250) - Rows C, D, E, F
    - **Silver Classic** (₹150) - Rows G, H, J, K
  - Distinct vacant, selected, and occupied seat states with aisle spacing.
  - Live price calculator and optional F&B snacks add-on selector.
  - Strict step validation: Payment button remains inactive until at least 1 seat is picked.
- **Step 3: Multi-Method Payment Option:**
  - Real-time interactive UPI QR Code with countdown timer and simulated instant scan.
  - Credit / Debit Card form with live validation.
  - Net Banking picker.
  - Promo discount codes (`DEVARA50` for ₹100 off, `NTRFANS` for ₹150 off).
- **Step 4: Instant Digital M-Ticket Generation:**
  - Perforated physical cinema ticket card with booking reference ID, movie poster, show details, seat numbers, total paid, and rendered scannable QR code.
  - 1-click Print / Download Ticket functionality.

### 5. 👤 User Profile & Previous Movie Bookings History
- User Profile modal accessible from top navigation with user initials avatar, contact details, membership tier (*Ruby Red VIP Cinephile*), and loyalty points.
- **Previous Movie Bookings History:** Displays past tickets with full details and a **"View Ticket"** button that re-opens the complete digital ticket modal for any past booking.
- Includes pre-loaded historical bookings and automatically persists every new booking into `localStorage`.
- Edit profile functionality to update user name, phone, email, and city.

### 6. ☁️ AWS & Git Production Ready
- Pre-configured for deployment to **AWS S3 + CloudFront**, **AWS Amplify**, or **AWS EC2 (Docker / Nginx)**.
- Includes `amplify.yml`, `Dockerfile`, `nginx.conf`, `docker-compose.yml`, `deploy-aws.sh`, `deploy-aws.ps1`, and GitHub Actions workflow `.github/workflows/deploy-aws.yml`.

---

## 📂 Project Architecture

```
c:\Users\erlas\Downloads\MOVIE\
├── .github/
│   └── workflows/
│       └── deploy-aws.yml       # GitHub Actions automated CI/CD for AWS
├── assets/
│   ├── icons/
│   │   └── logo.svg             # CineRed neon red cinema reel SVG logo
│   └── images/
│       ├── devara.jpg           # Official Devara: Part 1 theatrical poster
│       ├── devara_backdrop.webp # Devara wide landscape backdrop
│       ├── aravinda_sametha.jpg # Official Aravinda Sametha theatrical poster
│       └── aravinda_backdrop.jpg# Aravinda Sametha wide backdrop
├── css/
│   └── style.css                # Black & red design system, glassmorphism, responsive styles
├── js/
│   ├── data.js                  # Movie metadata, theatres, seat pricing, default bookings
│   └── app.js                   # State manager, seat layout generator, live ticker, payment, tickets
├── index.html                   # Semantic HTML5 Single-Page Application
├── Dockerfile                   # Production Nginx container image
├── nginx.conf                   # Nginx web server configuration with gzip & security headers
├── docker-compose.yml           # Multi-container orchestration
├── amplify.yml                  # AWS Amplify CI/CD configuration
├── deploy-aws.sh                # Linux / Git Bash AWS S3 deploy script
├── deploy-aws.ps1               # Windows PowerShell AWS S3 deploy script
├── .gitignore                   # Standard ignore patterns
├── AWS_DEPLOYMENT.md            # Step-by-step AWS deployment walkthrough
└── README.md                    # Project documentation
```

---

## 🚀 Quick Start (Local Run)

You can launch and view the application instantly using Python's built-in web server or simply double-clicking `index.html`:

```bash
# Using Python
python -m http.server 8080
```
Then open [http://localhost:8080](http://localhost:8080) in any web browser.

---

## 🚢 Pushing to Git & Deploying to AWS

For full step-by-step instructions, see [AWS_DEPLOYMENT.md](AWS_DEPLOYMENT.md).

### 1. Push to your Git Repository:
```bash
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
git branch -M main
git push -u origin main
```

### 2. Deploy to AWS:
- **AWS Amplify:** Connect your GitHub repo in AWS Amplify Console for 1-click CI/CD.
- **AWS S3:** Run `./deploy-aws.sh <your-bucket-name>` or `.\deploy-aws.ps1 -BucketName "<your-bucket-name>"`.
- **AWS EC2:** Clone the repo on an EC2 instance and run `docker compose up -d --build`.
