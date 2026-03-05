# ✦ SparkWash — Fullstack Car Wash Management System

A production-grade fullstack application for car wash businesses.

**Stack:** Node.js + Express · MongoDB · React + Vite · Socket.io · JWT · Swagger · Nodemailer · Docker

---

## 🏗️ Architecture

```
sparkwash-fullstack/
├── docker-compose.yml          # One-command full stack spin-up
├── backend/                    # Express API
│   ├── src/
│   │   ├── server.js           # Entry, Express + Socket.io setup
│   │   ├── config/             # DB, Swagger, Logger
│   │   ├── models/             # Mongoose schemas
│   │   ├── controllers/        # Business logic
│   │   ├── routes/             # Express routers + Swagger JSDoc
│   │   ├── middleware/         # JWT auth, error handler
│   │   └── utils/              # Email, seed script, follow-up job
│   ├── .env                    # Environment variables
│   └── Dockerfile
└── frontend/                   # React + Vite
    ├── src/
    │   ├── api/                # Fetch wrapper + Socket.io client
    │   ├── context/            # Auth context with JWT + socket events
    │   ├── pages/              # All 8 pages
    │   ├── components/         # InvoiceModal
    │   ├── layouts/            # Sidebar + notification bell
    │   └── utils/              # Constants + helpers
    ├── .env                    # VITE_API_URL + VITE_SOCKET_URL
    ├── nginx.conf              # Production nginx config
    └── Dockerfile
```

---

## 🚀 Quick Start — Docker (Recommended)

```bash
# 1. Clone / unzip
cd sparkwash-fullstack

# 2. Spin up everything (MongoDB + Backend + Frontend)
docker-compose up --build

# 3. Seed the database
docker exec sparkwash_backend node src/utils/seed.js

# 4. Open
http://localhost:5173     # Frontend
http://localhost:5000/api/docs  # Swagger API Docs
```

---

## 🛠️ Manual Setup (Development)

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)

### Backend

```bash
cd backend
npm install

# Edit .env if needed (MongoDB URI, SMTP settings)
# Default connects to mongodb://localhost:27017/sparkwash

# Seed the database
npm run seed

# Start dev server (with nodemon)
npm run dev
# → http://localhost:5000
# → http://localhost:5000/api/docs (Swagger)
```

### Frontend

```bash
cd frontend
npm install

# Start dev server
npm run dev
# → http://localhost:5173
```

> The frontend Vite dev server proxies `/api` and `/socket.io` to `localhost:5000` automatically.

---

## 🔐 Default Login Credentials

| Role        | Username      | Password   |
|-------------|---------------|------------|
| Admin       | `admin`       | `admin123` |
| Staff       | `staff1`      | `staff123` |
| Accountant  | `accountant`  | `acct123`  |
| Customer    | `customer`    | `cust123`  |

---

## 🌐 Public Booking Page

No login required:
```
http://localhost:5173/booking
```

---

## 📚 API Documentation

Swagger UI available at:
```
http://localhost:5000/api/docs
```

### Key Endpoints

| Method | Endpoint                        | Auth    | Description                    |
|--------|---------------------------------|---------|--------------------------------|
| POST   | `/api/auth/login`               | Public  | Login, returns JWT             |
| GET    | `/api/auth/me`                  | JWT     | Current user                   |
| GET    | `/api/bookings`                 | JWT     | List bookings (filterable)     |
| POST   | `/api/bookings`                 | Public  | Create booking                 |
| GET    | `/api/bookings/slots?date=`     | Public  | Get booked time slots          |
| PATCH  | `/api/bookings/:id`             | JWT     | Update status/assign staff     |
| POST   | `/api/bookings/:id/complete`    | JWT     | Complete + generate bill       |
| GET    | `/api/customers`                | JWT     | CRM customer list              |
| GET    | `/api/customers/:id`            | JWT     | Customer detail + history      |
| PATCH  | `/api/customers/:id`            | JWT     | Update notes/email             |
| GET    | `/api/staff`                    | JWT     | Staff list                     |
| POST   | `/api/staff`                    | Admin   | Add staff                      |
| PATCH  | `/api/staff/:id/attendance`     | JWT     | Toggle attendance              |
| GET    | `/api/inventory`                | JWT     | Inventory list                 |
| POST   | `/api/inventory/:id/restock`    | JWT     | Add stock                      |
| GET    | `/api/accounts/transactions`    | JWT     | Transaction log                |
| POST   | `/api/accounts/expenses`        | JWT     | Log expense                    |
| GET    | `/api/reports/dashboard`        | JWT     | Dashboard stats                |
| GET    | `/api/reports/analytics`        | JWT     | Full analytics                 |
| GET    | `/api/reports/pnl`              | JWT     | P&L by month                   |

---

## 🔌 Real-Time Events (Socket.io)

| Event                | Direction      | Payload                              |
|----------------------|----------------|--------------------------------------|
| `booking:new`        | Server → Client| `{ booking }`                        |
| `booking:updated`    | Server → Client| `{ booking }`                        |
| `booking:completed`  | Server → Client| `{ bookingId, amount }`              |
| `inventory:low`      | Server → Client| `{ item, quantity }`                 |
| `inventory:restocked`| Server → Client| `{ item, quantity }`                 |
| `dashboard:refresh`  | Server → Client| (no payload)                         |
| `notification`       | Server → Client| `{ type, message, time }`            |

---

## 📧 Email Notifications

Three email events:
1. **Booking Confirmation** — sent when customer books
2. **Invoice** — sent after payment is recorded
3. **Follow-up Reminder** — sent to customers inactive 7+ days

To enable, get free test credentials from [Ethereal Email](https://ethereal.email) and add to `backend/.env`:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_user@ethereal.email
SMTP_PASS=your_password
```

---

## 🗃️ MongoDB Collections

| Collection     | Description                              |
|----------------|------------------------------------------|
| `users`        | Auth accounts (hashed passwords)         |
| `bookings`     | All wash appointments                    |
| `customers`    | CRM records with wash history            |
| `staff`        | Staff profiles, attendance, commissions  |
| `inventory`    | Stock items with usage-per-wash rates    |
| `transactions` | Payment records                          |
| `expenses`     | Manual expense entries                   |

---

## 🔒 Role-Based Access

| Route             | Admin | Staff | Accountant | Customer |
|-------------------|-------|-------|------------|----------|
| Dashboard         | ✅    | ✅    | ✅         | ✅       |
| Bookings          | ✅    | ✅    | ✅         | ❌       |
| Customers / CRM   | ✅    | ❌    | ✅         | ❌       |
| Staff             | ✅    | ❌    | ❌         | ❌       |
| Inventory         | ✅    | ✅    | ❌         | ❌       |
| Accounts          | ✅    | ❌    | ✅         | ❌       |
| Reports           | ✅    | ❌    | ✅         | ❌       |

---

## ⚙️ Environment Variables

### Backend `.env`

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/sparkwash
JWT_SECRET=change_this_in_production
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_user
SMTP_PASS=your_pass
SMTP_FROM=noreply@sparkwash.com
```

### Frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🏭 Production Build

```bash
# Frontend build
cd frontend && npm run build
# Output: frontend/dist/

# Backend
cd backend && npm start

# Or with Docker
docker-compose -f docker-compose.yml up --build -d
```

---

## 🔄 System Flow

```
POST /api/bookings (public)
    → Customer upserted in DB
    → Socket.io: booking:new emitted to all admin clients
    → Email: booking confirmation sent

PATCH /api/bookings/:id { status: 'approved' }
    → Socket.io: booking:updated emitted

POST /api/bookings/:id/complete
    → Transaction saved
    → Customer: totalSpent++, points updated, membership upgraded
    → Staff: commission added to monthlyEarnings
    → Inventory: stock deducted per package
    → If inventory low: Socket.io inventory:low emitted
    → Email: invoice sent to customer
    → Socket.io: booking:completed + dashboard:refresh emitted
```
