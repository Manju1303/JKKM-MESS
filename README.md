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

## 📡 Live Production Deployment on Koyeb

Koyeb handles SSL (HTTPS/WSS) termination and routing natively. We can deploy the application by bypassing the Nginx proxy completely.

### 1. Database Setup
1. Log in to the **Koyeb Console**.
2. Click **Create Service** and select **Database** $\rightarrow$ **PostgreSQL**.
3. Copy the generated database connection string (e.g., `postgresql://koyeb-db:xxx@ep-xxx.koyeb.app/koyebdb?sslmode=require`).

### 2. Backend Service Setup (NestJS)
1. Click **Create Service** and select **Web Service** $\rightarrow$ **GitHub**.
2. Connect your repository `Manju1303/JKKM-MESS`.
3. Configure settings:
   * **Service Name**: `jkkm-backend`
   * **Builder**: Docker
   * **Dockerfile Path**: `backend/Dockerfile`
   * **Context Directory**: `backend`
   * **Exposed Port**: `3001` (Protocol: `HTTP`, Path: `/`)
4. Add the following environment variables:
   * `NODE_ENV` = `production`
   * `PORT` = `3001`
   * `DATABASE_URL` = *(Your connection string from Step 1)*
   * `JWT_SECRET` = *(Provide a secure random key)*
   * `FRONTEND_URL` = `https://erp.arockiamedicalcentre.in` (Or your Koyeb Frontend URL)

### 3. Frontend Service Setup (Next.js)
1. Click **Create Service** and select **Web Service** $\rightarrow$ **GitHub**.
2. Connect your repository.
3. Configure settings:
   * **Service Name**: `jkkm-frontend`
   * **Builder**: Buildpack (Node.js)
   * **Work Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Run Command**: `npm run start`
   * **Exposed Port**: `3000` (Protocol: `HTTP`, Path: `/`)
4. Add environment variables:
   * `NEXT_PUBLIC_API_URL` = `https://api-mess.arockiamedicalcentre.in/api/v1` (Or backend's Koyeb URL)
   * `NEXT_PUBLIC_SOCKET_URL` = `https://api-mess.arockiamedicalcentre.in` (Without `/api/v1` suffix)

### 4. Domain & SSL Setup
Under each service's **Domains** tab, add your custom domain:
* Map `api-mess.arockiamedicalcentre.in` to the **Backend Service**.
* Map `erp.arockiamedicalcentre.in` to the **Frontend Service**.
* Add the CNAME records in your DNS/Cloudflare dashboard as instructed by Koyeb.

---

## ⚠️ Institutional/College Network DNS Blocks

If you receive **"Cannot reach the server"** or **`Recv failure: Connection was reset`** errors while connecting to database endpoints (`*.neon.tech`, `*.koyeb.app`) from a college/institutional firewall:
1. **Disable IPv6 locally:** Uncheck *Internet Protocol Version 6 (TCP/IPv6)* under your Network Adapter properties in Windows.
2. **Use a VPN or Mobile Hotspot:** Connecting via VPN or hotspot immediately bypasses local network blocks.
