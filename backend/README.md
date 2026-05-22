# JKKM Mess ERP - Backend

NestJS + Prisma + PostgreSQL backend for the JKKM Enterprise Hostel Mess Automation ERP.

## 🚀 Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env` with your PostgreSQL credentials and secrets.

### 3. Setup database
```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed initial data (roles, users, products)
npm run db:seed
```

### 4. Start development server
```bash
npm run start:dev
```

Server runs at: http://localhost:3001  
API Docs (Swagger): http://localhost:3001/api/docs

## 🏗️ Architecture

```
src/
├── auth/              # JWT auth, guards, strategies
├── users/             # User management
├── products/          # Product catalog + barcode lookup
├── inventory/         # FIFO stock management + alerts
├── suppliers/         # Supplier management
├── purchases/         # Purchase orders + approval workflow
├── kitchen/           # Stock issue + meal tracking
├── consumption/       # Consumption analytics + per-head cost
├── wastage/           # Wastage reporting
├── reports/           # Excel report generation
├── attendance/        # Meal headcount tracking
├── notifications/     # In-app notification system
├── ai/                # Statistical predictions + anomaly detection
├── gateway/           # WebSocket real-time events
└── prisma/            # Database service
```

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@jkkm.edu.in | Admin@123 |
| Mess Manager | manager@jkkm.edu.in | Manager@123 |
| Kitchen Staff | kitchen@jkkm.edu.in | Staff@123 |

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/v1/auth/login | Login |
| GET | /api/v1/inventory/dashboard | Dashboard data |
| GET | /api/v1/inventory/low-stock | Low stock alerts |
| POST | /api/v1/purchases | Create PO |
| POST | /api/v1/purchases/:id/approve | Approve PO → auto stocks |
| POST | /api/v1/kitchen/issue | Issue to kitchen → auto deducts |
| GET | /api/v1/ai/insights | AI-powered insights |
| POST | /api/v1/reports/daily | Generate daily Excel report |

## 🔌 WebSocket Events

Connect to `ws://localhost:3001`  
Events emitted: `low-stock-alert`, `expiry-alert`, `kitchen-issue`, `new-purchase`, `notification`
