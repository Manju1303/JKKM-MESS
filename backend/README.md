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
DATABASE_URL="postgresql://neondb_owner:npg_GIV4HTpyQZ3N@ep-late-darkness-ao4qhb6o.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
PORT=3001
JWT_SECRET="89194fed62701567e1fd90ce34a5df608c619553bcd875d01b78448b26811631819913a0de871dbc2914272101bec5c581cfdcb35d33645668b5c0befcbba391"
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

## 📡 Live Deployment (Koyeb)

* **Deployment URL:** `https://api-mess.arockiamedicalcentre.in`
* **Custom Start Command:** `npx prisma migrate deploy && node dist/src/main` (runs migrations automatically before launching backend).
* **Port Mapping:** Exposes port `3001` (Koyeb automatically routes public HTTPS traffic to it).
* **Important:** Set the **Docker Context Directory** to `backend` and **Dockerfile Path** to `Dockerfile` when deploying on Koyeb. Ensure that environment variables in the Koyeb dashboard are set without quotes.

### **⚠️ Institutional/College Network DNS Blocks**
Many educational institutes (such as JKKM College networks) block database endpoints (`*.neon.tech`) and container hosts (`*.up.railway.app`) over standard IPv6. 

If you receive **"Cannot reach the server"** or **`Recv failure: Connection was reset`** errors while connecting from a college network:
1. **Disable IPv6 locally:** Uncheck *Internet Protocol Version 6 (TCP/IPv6)* under your Network Adapter properties in Windows to force connections over IPv4.
2. **Use a VPN or Mobile Hotspot:** Connecting via VPN or hotspot immediately bypasses local firewall blocks.
