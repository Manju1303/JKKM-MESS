# JKKM Mess ERP

Enterprise-grade **Hostel Mess Automation & Management System** for the JKKM Group of Institutions. This repository contains the Next.js frontend, NestJS backend, and containerization configuration.

---

## 🏗️ Repository Architecture

The project is organized as a monorepo-style structure:
* **`/backend`**: NestJS application with Prisma ORM and PostgreSQL integration.
* **`/frontend`**: Next.js application built with Tailwind CSS, Shadcn/UI, and Zustand.
* **`/nginx`**: Nginx reverse proxy configuration for handling SSL/TLS termination on Virtual Private Servers (VPS).
* **`/scripts`**: Automation and deployment scripts.

---

## 🚀 Local Development Setup

You can run the entire system locally using Docker Compose, or run the frontend and backend manually.

### Option A: Running with Docker Compose (Recommended)
This spins up PostgreSQL, Redis, the NestJS Backend, and the Next.js Frontend together.

1. Make sure you have **Docker** and **Docker Compose** installed.
2. Clone the repository and navigate to the directory:
   ```bash
   cd erp
   ```
3. Start the services in development mode:
   ```bash
   docker compose up -d --build
   ```
4. Access the applications:
   * **Frontend**: `http://localhost:3000`
   * **Backend API**: `http://localhost:3001`
   * **Swagger API Docs**: `http://localhost:3001/api/docs`

---

### Option B: Running Services Manually

#### 1. Database Setup
Ensure you have a PostgreSQL instance running. Alternatively, you can use a hosted PostgreSQL instance (like Neon).

#### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/jkkm_mess_erp?schema=public"
   PORT=3001
   FRONTEND_URL="http://localhost:3000"
   JWT_SECRET="your-development-jwt-secret-key"
   JWT_EXPIRES_IN="7d"
   NODE_ENV="development"
   ```
4. Run migrations and seed data:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npm run db:seed
   ```
5. Start the backend:
   ```bash
   npm run start:dev
   ```

#### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file:
   ```env
   NEXT_PUBLIC_API_URL="http://localhost:3001/api/v1"
   NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```

---

## 🔑 Demo Credentials

The database seeding process creates the following testing accounts:

| Role | Email | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@jkkm.edu.in` | `Jkkm@Admin2026` | Full system access, registration |
| **Mess Manager** | `messmanager@jkkm.edu.in` | `Jkkm@Mess2026` | Dashboard, purchases, inventory, reports |
| **Storekeeper** | `storekeeper@jkkm.edu.in` | `Jkkm@Store2026` | Inventory movements, PO creation |
| **Kitchen Staff** | `kitchen@jkkm.edu.in` | `Jkkm@Kitchen2026` | Kitchen stock issues, daily loggings |
| **Accountant** | `accounts@jkkm.edu.in` | `Jkkm@Accounts2026` | Financial report downloading, audit logs |
| **Hostel Warden** | `warden@jkkm.edu.in` | `Jkkm@Warden2026` | Headcount logs, complaints management |
| **Student Viewer** | `student@jkkm.edu.in` | `Jkkm@Student2026` | View daily menu, file complaints |

---

## 📡 Live Production Deployment (Render + Supabase + Vercel)

This setup describes the 100% Free Plan with **24/7 always-on uptime** and low latency by deploying the backend to Render, database to Supabase, and frontend to Vercel.

### 1. Database Setup (Supabase)
1. Register/Login at [Supabase.com](https://supabase.com).
2. Create a new project pointing to the closest region (e.g. `Singapore` or `Oceania`).
3. Click the **Connect** button at the top of your dashboard.
4. Copy the connection string. You will need:
   * **`DATABASE_URL`** (Transaction-mode pooler: port `6543`, `pgbouncer=true`):
     `postgresql://postgres.[ID]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true`
   * **`DIRECT_URL`** (Session-mode: port `5432` — used for Prisma migrations):
     `postgresql://postgres.[ID]:[PASSWORD]@aws-1-[REGION].pooler.supabase.com:5432/postgres`

### 2. Backend Service Setup (Render)
1. Sign in to your [Render.com](https://render.com) dashboard.
2. Click **New +** and select **Web Service**. Connect your GitHub repository.
3. Configure the settings:
   * **Service Name**: `jkkm-backend`
   * **Region**: Select `Singapore` (closest to database and user network).
   * **Root Directory**: `backend` *(Crucial: Build only the NestJS backend context!)*
   * **Runtime**: Select **Docker** (Render will automatically detect `backend/Dockerfile`).
   * **Instance Type**: Select the **Free** tier.
4. Expand the **Advanced** section to add the following **Environment Variables**:
   * `NODE_ENV` = `production`
   * `PORT` = `3001`
   * `DATABASE_URL` = *(Your pooled connection string from Step 1)*
   * `DIRECT_URL` = *(Your direct connection string from Step 1)*
   * `JWT_SECRET` = *(Generate a secure random key)*
   * `FRONTEND_URL` = `https://erp.arockiamedicalcentre.in`
5. Click **Create Web Service**. Note the deployed URL (e.g., `https://jkkm-backend.onrender.com`).

### 3. Frontend Deployment (Vercel)
1. Deploy the `frontend/` directory to **Vercel**.
2. Set the environment variables in the Vercel dashboard:
   * `NEXT_PUBLIC_API_URL` = `https://your-render-backend-url.onrender.com/api/v1`
   * `NEXT_PUBLIC_SOCKET_URL` = `https://your-render-backend-url.onrender.com`
3. Map your custom domain `erp.arockiamedicalcentre.in` to the Vercel project deployment.

### 4. 24/7 Keep-Alive Setup (UptimeRobot)
Render puts free services to sleep after 15 minutes of inactivity. To bypass this sleep:
1. Create a free account on [UptimeRobot.com](https://uptimerobot.com) (no credit card required).
2. Create an **HTTP(s)** monitor:
   * **URL**: `https://your-render-backend-url.onrender.com/api/v1/health`
   * **Interval**: Every **5 minutes**
3. Save the monitor. This regularly pings the container's health endpoint to keep it awake 24/7.

---

## ⚠️ Institutional/College Network DNS Blocks

If you receive **"Cannot reach the server"** or **`Recv failure: Connection was reset`** errors while connecting to database endpoints (`*.neon.tech`, `*.koyeb.app`) from a college/institutional firewall:
1. **Disable IPv6 locally:** Uncheck *Internet Protocol Version 6 (TCP/IPv6)* under your Network Adapter properties in Windows.
2. **Use a VPN or Mobile Hotspot:** Connecting via VPN or hotspot immediately bypasses local network blocks.
