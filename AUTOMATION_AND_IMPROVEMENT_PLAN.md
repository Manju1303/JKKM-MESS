# JKKM-MESS ERP: System Analysis, Automation & Improvements

This document outlines the findings of our codebase review, the new **passive and active automation loops** we have already introduced, and the blueprints for future automated advancements.

---

## 1. System Analysis & Clean State
We performed a full scan of the project root and subdirectories to ensure it remains clean, responsive, and free of redundant assets:
* **Clean Directory Structure:** The frontend uses Next.js App Router exclusively (verified no legacy `/pages` folder conflicts). DevOps configurations (like Nginx, backup shell scripts, and GitHub action triggers) were preserved for server maintenance.
* **Consolidated Operational Workflow:** The system now strictly maps to 3 key user roles, ensuring clear operational boundaries and removing overhead from accounts, storekeeper, and kitchen staff:
  * **SUPER_ADMIN**: Oversees accounts, logs, configuration, and security.
  * **MESS_MANAGER**: Operations master who plans menu guides, scans purchases, logs bulk stocks, and tracks wastage.
  * **HOSTEL_WARDEN**: Directly tracks student presence counts, manages daily suggestions, and resolves complaints.

---

## 2. Automations Implemented in This Session
To reduce the administrative load of manuals logs, we implemented these automated systems directly into the backend and frontend code:

### ⚙️ Persistent Stock Deficit Logs (Backend & DB)
* **What it does:** Whenever fresh stock is issued to the kitchen and the total remaining amount of that ingredient drops below its predefined `minStockLevel` threshold, the system automatically triggers a persistent `Notification` log in the database.
* **Why it's better:** In addition to transient WebSocket alerts, managers and administrators will now see low-stock warnings saved reliably inside their Inbox feed when loging in.

### 🍎 Smart Vegetable Selection & Combobox (Frontend)
* **What it does:** Integrated a dynamic autocomplete datalist onto the Barcode Station manual search field.
* **Why it's better:** Instead of having to look up SKU codes manually for fresh groceries and vegetables (which don't carry barcodes), the manager can type a name (e.g., "Tomato"), pick it, and have the system retrieve price/batch context instantly to record the quantity.

### 🥖 Smart Purchase Order (PO) Alerts
* **What it does:** Added automated persistent alert handlers inside `PurchasesService` when:
  1. A PO request draft is saved (`PENDING` alert to Super Admin).
  2. A PO is approved (`APPROVED` confirmation to manager, inventory auto-updated).
  3. A PO is rejected (`REJECTED` warning logs).

### 📅 Pre-emptive Food Expiry Sweeper
* **What it does:** Optimized the `getExpiringSoon` service call. Every time an administrator or manager loads the dashboard, the system sweeps stored batches for any ingredients expiring in the next 7 days, checks if it has logged it previously, and auto-logs a Warning notification to save it from going to waste.

### 📥 One-Click Stocks Report Engine
* **What it does:** Placed an instant **Export CSV** download utility directly in the inventory page.
* **Why it's better:** Automatically compile current database levels (inclusive of active search filters or threshold filters) into a download format to email, print, or review offline instantly.

---

## 3. Recommended Future Improvements Plan

Here is a 4-step blueprint to expand automation on top of the consolidated 3-role structure:

| Project Phase | Description | Goal | High-Impact Automation |
|:---|:---|:---|:---|
| **Phase 1: Automated Attendance Integration** | Hook college biometric scanners or RFID turnstile devices directly to the ERP. | Eliminate manually typing forecast student headcounts. | Webhook inputs from turnstiles feed real-time headcount numbers directly into the AI Predictions algorithm. |
| **Phase 2: Auto-Draft Purchase Recommendations** | Write a draft PO script based on predicted 7-day ingredients needed vs safety stocks. | Save Mess Managers from manual calculations. | At 6:00 PM every Sunday, the system builds draft PO requests with items below buffer, selects matching suppliers, and drafts order emails automatically. |
| **Phase 3: Automated FEFO Stock Locking** | Lock inventories that have expired or warn staff against using out-of-order date batches. | Prevent biological contamination and waste. | If kitchen staff attempts to issue stock from a newer batch while an older batch is still unused (First-Expiry, First-Out), flag a visual warning. |
| **Phase 4: Consumption Cost-Per-Meal Charts** | Feed daily purchase costs (inclusive of GST details) against issued volumes to chart exact rupee consumption metrics. | Real-time budgeting dashboards. | Automatically compute cost-of-ingredients-consumed per student every afternoon and render graphs on the dashboard. |
