# Sankai Residence — Hotel Management System

A complete, production-ready hotel management web application for **Sankai Residence**.

---

## 🏨 Features

- **Dashboard** — Real-time stats, room availability, revenue, charts
- **Room Management** — 30 rooms across 3 floors, visual status grid
- **Booking Engine** — Full booking flow with double-booking prevention
- **Customer Management** — Profiles, history, ID verification
- **Payment Tracking** — Multi-payment, partial payments, refunds
- **Check-in / Check-out** — With room status automation
- **Expense Management** — Categories, receipts, tracking
- **Employee & Salary** — Staff management and salary payments
- **Water Bill Tracking** — Monthly water bill management
- **Monthly Reports** — Revenue, expenses, profit/loss, occupancy
- **Monthly Tally** — Complete financial summary with CSV export
- **Audit Logs** — Every action tracked
- **Role-based Access** — Super Admin, Manager, Receptionist, Accountant
- **Responsive Design** — Works on desktop, tablet, mobile

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- npm

### 1. Setup PostgreSQL

```bash
# Create database
createdb sankai_residence
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DB credentials

npm install
npm run migrate:seed   # Run migrations and seed data
npm run dev            # Start development server
```

Backend runs on: **http://localhost:5000**

### 3. Frontend Setup

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Frontend runs on: **http://localhost:3000**

---

## 🐳 Docker Deployment

```bash
# Build and start everything
docker-compose up -d

# Run seed data (first time only)
docker exec sankai_backend node -e "require('./dist/seeds/index.js').runSeeds()"
```

Access: **http://localhost:3000**

---

## 🔐 Default Login Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@sankai.com | Admin@123 |
| Manager | manager@sankai.com | Admin@123 |
| Receptionist | receptionist@sankai.com | Admin@123 |

**⚠️ Change passwords immediately in production!**

---

## 🏗️ Architecture

```
sankai-residence/
├── backend/           # Node.js + TypeScript + Express API
│   ├── src/
│   │   ├── config/    # Database config
│   │   ├── controllers/  # Route handlers
│   │   ├── middleware/   # Auth, audit logging
│   │   ├── migrations/   # DB schema
│   │   ├── routes/       # API routes
│   │   ├── seeds/        # Sample data
│   │   └── utils/        # Logger
│   └── Dockerfile
├── frontend/          # React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── api/       # API client
│   │   ├── components/   # Reusable UI components
│   │   ├── context/   # Auth context
│   │   ├── pages/     # Page components
│   │   ├── types/     # TypeScript types
│   │   └── utils/     # Helpers
│   └── Dockerfile
└── docker-compose.yml
```

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/login`
- `GET /api/auth/me`

### Rooms
- `GET /api/rooms` — All rooms (filter by floor, status)
- `GET /api/rooms/availability` — Available rooms for date range
- `PUT /api/rooms/:id/status` — Update room status

### Bookings
- `POST /api/bookings` — Create booking
- `GET /api/bookings` — List bookings (search, filter, paginate)
- `GET /api/bookings/:id` — Booking details with payments
- `POST /api/bookings/:id/checkin` — Check in
- `POST /api/bookings/:id/checkout` — Check out
- `POST /api/bookings/:id/cancel` — Cancel booking
- `POST /api/bookings/:id/extend` — Extend stay

### Payments
- `POST /api/payments` — Add payment
- `GET /api/payments/pending` — Pending payments

### Reports
- `GET /api/reports/dashboard` — Dashboard data
- `GET /api/reports/monthly?year=&month=` — Monthly P&L
- `GET /api/reports/yearly?year=` — Yearly revenue chart

---

## 🧱 Database Schema

Key tables:
- `floors`, `rooms` — Hotel structure
- `customers` — Guest information
- `bookings` — All bookings with status tracking
- `payments` — Payment history
- `expenses`, `expense_categories` — Expense management
- `employees`, `salary_payments` — Staff management
- `water_bills` — Utility tracking
- `audit_logs` — Action history
- `notifications` — System notifications

---

## 🛡️ Security

- JWT authentication with 24h expiry
- bcrypt password hashing (10 rounds)
- Role-based access control (4 roles)
- Helmet.js security headers
- CORS protection
- Input validation
- Soft delete (financial records never hard-deleted)
- Audit logging of all important actions

---

## 📊 Business Rules Implemented

1. ✅ Double booking prevention with overlap detection
2. ✅ Check-out date must be after check-in date
3. ✅ Automatic stay days calculation
4. ✅ Total = Room Rate × Days + Additional Charges - Discount
5. ✅ Pending = Total - Paid
6. ✅ Checked-out rooms → CLEANING → AVAILABLE
7. ✅ Maintenance rooms cannot be booked
8. ✅ Cancelled bookings don't affect availability
9. ✅ All payment history preserved
10. ✅ Monthly reports from actual transactions
