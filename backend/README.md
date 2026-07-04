# JKKM Mess ERP - Backend

Enterprise-grade NestJS + Prisma + PostgreSQL backend for the **JKKM Enterprise Hostel Mess Automation ERP**.

---

## 🏗️ System Architecture

The JKKM Mess ERP backend is structured as a modular NestJS application following domain-driven design principles.

### **Directory Structure**
```text
src/
├── auth/              # Authentication module (JWT, Guards, Local/JWT Strategies)
├── users/             # User accounts & RBAC profiles
├── products/          # Product catalog & scanner barcode integration
├── inventory/         # FIFO stock management, dashboard statistics, & low-stock alerts
├── suppliers/         # Vendor database & GST/PAN metadata
├── purchases/         # Purchase order creation, tracking, & approval workflow
├── kitchen/           # Stock issue to kitchen & meal tracking
├── consumption/       # Daily consumption logs & headcount metrics
├── wastage/           # Spoiled/expired food wastage reporting & valuation loss
├── reports/           # Excel report generation engine
├── attendance/        # Student headcount tracking per meal
├── notifications/     # In-app alert dispatch system
├── ai/                # Statistical consumption predictions
├── gateway/           # Socket.io gateway for real-time live dashboard updates
└── prisma/            # Database connectivity wrapper
```

---

## 📊 In-Memory Report Architecture

The report engine (`reports.service.ts`) uses a custom, high-performance **in-memory architecture**:
* **No Disk Writes:** Reports are generated on-the-fly using `ExcelJS` as raw memory buffers (`ArrayBuffer`). This makes the system fully compatible with **Railway's ephemeral filesystem** (where files written to disk are deleted upon container restart).
* **Zebra-Striping & Premium Styling:** Reports are automatically styled with matching brand colors (`#1F497D`), custom column sizing, proper numeric formatting, and total-valuation rows.
* **On-Demand Streaming:** The controller streams the buffer directly to the client's HTTP response stream with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, downloading instantly in the browser.

### **Report Endpoints**
* `GET /api/v1/reports` $\rightarrow$ Lists metadata of all generated reports.
* `POST /api/v1/reports/daily` $\rightarrow$ Streams a daily consumption, purchase, and wastage summary.
* `POST /api/v1/reports/monthly` $\rightarrow$ Streams a monthly purchase order spending report.
* `POST /api/v1/reports/inventory` $\rightarrow$ Streams the live inventory valuation report.

---

## 🔑 Demo Credentials

The database seed contains 7 distinct user profiles for Testing:

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

## 🚀 Quick Start & Installation

### **1. Install Dependencies**
```bash
npm install
```

### **2. Configure Environment**
Create a `.env` file inside the `backend` folder:
```env
DATABASE_URL="postgresql://username:password@hostname:5432/dbname?sslmode=require"
PORT=3001
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="https://erp.arockiamedicalcentre.in"
NODE_ENV="production"
```

### **3. Database Setup**
```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed users and catalog
npm run db:seed
```

### **4. Start Local Server**
```bash
npm run start:dev
```
* Local URL: `http://localhost:3001`
* Swagger Documentation: `http://localhost:3001/api/docs`

---

## 📡 Live Deployment (Render)

* **Deployment URL:** `https://your-app-name.onrender.com`
* **Custom Start Command:** Render automatically picks up `backend/Dockerfile` which has the migration execution built-in (`npx prisma migrate deploy && node dist/src/main`).
* **Port Mapping:** Exposes port `3001` (handled by setting `PORT=3001` in Environment Variables).
* **Important:** Set the **Root Directory** to `backend` when creating the service on Render. This forces the Docker build context to set itself inside the NestJS app directory. Add both `DATABASE_URL` (pooler) and `DIRECT_URL` (direct) in the environment settings.

### **⚠️ Institutional/College Network DNS Blocks**
Many educational institutes (such as JKKM College networks) block database endpoints (`*.supabase.co`, `*.neon.tech`) and container hosts (`*.koyeb.app`) over standard IPv6. 

If you receive **"Cannot reach the server"** or **`Recv failure: Connection was reset`** errors while connecting from a college network:
1. **Disable IPv6 locally:** Uncheck *Internet Protocol Version 6 (TCP/IPv6)* under your Network Adapter properties in Windows to force connections over IPv4.
2. **Use a VPN or Mobile Hotspot:** Connecting via VPN or hotspot immediately bypasses local firewall blocks.
