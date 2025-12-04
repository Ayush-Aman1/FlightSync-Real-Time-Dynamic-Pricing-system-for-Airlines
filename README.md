# FlightSync - Airline Dynamic Pricing System

A comprehensive full-stack web application for airline ticket booking with dynamic pricing, built as a Database Management Systems (DBMS) course project.


## Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [System Architecture](#-system-architecture)
- [Database Schema](#-database-schema)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Running the Application](#-running-the-application)
- [API Documentation](#-api-documentation)
- [Dynamic Pricing Algorithm](#-dynamic-pricing-algorithm)
- [Loyalty Program](#-loyalty-program)

---

## Overview

FlightSync is a dynamic pricing system for airlines that automatically adjusts flight prices based on demand, seat availability, time to departure, and booking patterns. The system provides both a customer-facing booking portal and an admin dashboard for airline management.

**Key Highlights:**
- Real-time dynamic pricing engine
- Complete booking lifecycle management
- Loyalty program with tier-based benefits
- Admin-only flight management (add/cancel flights)
- Comprehensive analytics dashboard

---

## Features

### Customer Portal
| Feature | Description |
|---------|-------------|
| **Flight Search** | Search flights by origin, destination, and date |
| **Dynamic Pricing** | See real-time prices based on demand |
| **Easy Booking** | Multi-passenger booking with class selection |
| **Payment Processing** | Multiple payment methods (UPI, Card, Net Banking) |
| **Reviews & Ratings** | Rate flights and read other reviews |
| **Loyalty Program** | Earn and redeem points with tier benefits |
| **Dashboard** | View upcoming flights, booking history, points |
| **Profile Management** | Update personal information |

### Admin Portal (Restricted Access)
| Feature | Description |
|---------|-------------|
| **Flight Management** | Add new flights, cancel existing ones |
| **Analytics Dashboard** | Revenue trends, route performance, booking stats |
| **Dynamic Pricing Control** | Refresh prices, view pricing insights |
| **Customer Analytics** | Loyalty tier distribution, top customers |
| **Abandoned Carts** | Track incomplete bookings |

> **Admin access is restricted to a single account:** `admin@flightsync.com`

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                      │
│  ┌─────────────────────┐     ┌─────────────────────────────┐   │
│  │   Customer Portal   │     │      Admin Dashboard        │   │
│  │  - Flight Search    │     │  - Flight Management        │   │
│  │  - Booking          │     │  - Analytics                │   │
│  │  - Reviews          │     │  - Pricing Control          │   │
│  │  - Loyalty          │     │  - Customer Insights        │   │
│  └─────────────────────┘     └─────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────┘
                              │ REST API (JSON)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Flask)                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Auth Service │ │Flight Service│ │ Booking Service      │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │Payment Svc   │ │Review Service│ │ Analytics Service    │    │
│  └──────────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              Dynamic Pricing Engine                     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ SQLAlchemy ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (PostgreSQL)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │Customers│ │ Flights │ │Bookings │ │Payments │ │ Reviews │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                          │
│  │Aircraft │ │ Prices  │ │Loyalty  │  + Views, Triggers,      │
│  └─────────┘ └─────────┘ │Trans.   │    Stored Procedures     │
│                          └─────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Entity-Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   CUSTOMER   │       │   BOOKING    │       │    FLIGHT    │
├──────────────┤       ├──────────────┤       ├──────────────┤
│ cust_id (PK) │◄──┐   │booking_id(PK)│   ┌──►│flight_id (PK)│
│ fname        │   │   │ cust_id (FK) │───┘   │ flight_code  │
│ lname        │   └───│ flight_id(FK)│       │ origin       │
│ email        │       │ seats_booked │       │ destination  │
│ phone        │       │ total_cost   │       │ dep_time     │
│ pass_hash    │       │ status       │       │ arr_time     │
│ loyalty_pts  │       │ booking_class│       │ aircraft_no  │
│ loyalty_tier │       └──────────────┘       │ status       │
└──────────────┘              │               └──────────────┘
       │                      │                      │
       │                      ▼                      │
       │               ┌──────────────┐              │
       │               │   PAYMENT    │              │
       │               ├──────────────┤              │
       │               │payment_id(PK)│              │
       └──────────────►│ booking_id   │              │
                       │ cust_id (FK) │              │
                       │ amount       │              │
                       │ method       │              │
                       │ status       │              │
                       └──────────────┘              │
                                                     │
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    REVIEW    │       │    PRICE     │       │   AIRCRAFT   │
├──────────────┤       ├──────────────┤       ├──────────────┤
│review_id (PK)│       │price_id (PK) │       │aircraft_no   │
│ flight_id    │───────│ flight_id    │◄──────│ (PK)         │
│ cust_id      │       │ base_price   │       │ model        │
│ rating       │       │ current_price│       │ manufacturer │
│ comment      │       │ surge_mult   │       │ capacity     │
└──────────────┘       └──────────────┘       └──────────────┘

┌────────────────────┐
│ LOYALTY_TRANSACTION│
├────────────────────┤
│ lt_id (PK)         │
│ cust_id (FK)       │
│ points             │
│ transaction_type   │
│ description        │
└────────────────────┘
```

### Tables Summary

| Table | Primary Key | Description |
|-------|-------------|-------------|
| `customers` | cust_id | User accounts with loyalty tracking |
| `flights` | flight_id | Flight schedules and availability |
| `bookings` | booking_id | Reservation records |
| `payments` | payment_id | Payment transactions |
| `reviews` | review_id | Customer feedback |
| `prices` | price_id | Dynamic pricing data |
| `aircraft` | aircraft_no | Fleet information |
| `loyalty_transactions` | lt_id | Points history |

### Key Database Objects

**Views:**
- `vw_flight_search` - Optimized flight search results
- `vw_customer_booking_history` - Customer's booking history
- `vw_flight_reviews_summary` - Aggregated review stats

**Stored Procedures:**
- `get_customer_dashboard()` - Dashboard statistics
- `get_route_pricing()` - Route-based pricing
- `process_booking()` - Atomic booking creation

**Triggers:**
- `trg_update_available_seats` - Auto-update seat count
- `trg_award_loyalty_points` - Award points on booking
- `trg_update_price_on_booking` - Trigger price recalculation

---

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Python 3.9+ | Backend language |
| Flask | Web framework |
| SQLAlchemy | ORM |
| PyJWT | Authentication |
| psycopg2 | PostgreSQL driver |
| hashlib | Password hashing (SHA256) |

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 | UI library |
| Vite | Build tool |
| TailwindCSS | Styling |
| React Router | Navigation |
| Axios | HTTP client |
| Recharts | Charts/graphs |
| Lucide React | Icons |

### Database
| Technology | Purpose |
|------------|---------|
| PostgreSQL 15+ | Primary database |
| MongoDB (optional) | Price history & analytics |

---

## Installation

### Prerequisites

- **Node.js** 18+ ([Download](https://nodejs.org/))
- **Python** 3.9+ ([Download](https://python.org/))
- **PostgreSQL** 15+ ([Download](https://postgresql.org/))
- **Git** ([Download](https://git-scm.com/))

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-username/flightsync.git
cd flightsync
```

### Step 2: Database Setup

#### 2.1 Create Database

**Using psql:**
```bash
# macOS (Postgres.app)
/Applications/Postgres.app/Contents/Versions/latest/bin/psql -U postgres

# Linux
sudo -u postgres psql

# Windows
psql -U postgres
```

```sql
CREATE DATABASE flightsync;
\c flightsync
```

#### 2.2 Run Schema

```sql
\i sql/01_schema.sql
\i sql/02_triggers.sql
\i sql/03_views.sql
\i sql/04_sample_data.sql
```

#### 2.3 Fix Password Hashes

The sample data has placeholder passwords. Run this to fix them:

```sql
-- Set all customer passwords to 'password123'
UPDATE customers 
SET pass_hash = 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f';

-- Add admin account (password: 'admin123')
INSERT INTO customers (fname, lname, email, phone, pass_hash, loyalty_tier, loyalty_pts)
VALUES (
    'Admin', 
    'FlightSync', 
    'admin@flightsync.com', 
    '9999999999', 
    '240be518fabd2724ddb6f04eeb9d5b075b707a04fa73ea9fc8d297c1abad53a9', 
    'Platinum', 
    99999
)
ON CONFLICT (email) DO UPDATE 
SET pass_hash = '240be518fabd2724ddb6f04eeb9d5b075b707a04fa73ea9fc8d297c1abad53a9';
```

### Step 3: Backend Setup

```bash
cd python

# Create virtual environment
python -m venv venv

# Activate virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Step 4: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

---

## Configuration

### Backend Configuration

Create/edit `python/.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flightsync
DB_USER=postgres
DB_PASSWORD=your_password

# JWT
SECRET_KEY=your-super-secret-key-change-in-production

# MongoDB (optional)
MONGO_URI=mongodb://localhost:27017/flightsync
```

Or edit `python/config.py` directly:

```python
class Config:
    DB_HOST = 'localhost'
    DB_PORT = 5432
    DB_NAME = 'flightsync'
    DB_USER = 'postgres'
    DB_PASSWORD = 'your_password'
    SECRET_KEY = 'your-secret-key'
```

### Frontend Configuration

Edit `frontend/vite.config.js` to match your backend port:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',  // Your Flask port
        changeOrigin: true
      }
    }
  }
})
```

---

## Running the Application

### Start Backend

```bash
cd python
source venv/bin/activate  # macOS/Linux
python app.py
```

Backend runs at: `http://localhost:5001`

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs at: `http://localhost:3000`

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| **Admin** | `admin@flightsync.com` | `admin123` |
| Customer | `rahul.sharma@email.com` | `password123` |
| Customer | `priya.patel@email.com` | `password123` |
| Customer | Any registered user | `password123` |

> **Note:** Only `admin@flightsync.com` can access admin features (Flight Management, etc.)

---

## API Documentation

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new customer | ❌ |
| POST | `/api/auth/login` | Login | ❌ |

**Register Request:**
```json
{
  "fname": "John",
  "lname": "Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "securepassword",
  "dob": "1990-01-15"
}
```

**Login Request:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Login Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "customer": {
    "cust_id": 1,
    "fname": "John",
    "lname": "Doe",
    "email": "john@example.com",
    "loyalty_tier": "Bronze",
    "loyalty_pts": 0
  }
}
```

### Flights

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/flights/search` | Search flights | ❌ |
| GET | `/api/flights/{id}` | Get flight details | ❌ |
| GET | `/api/flights/{id}/price-history` | Price history | ❌ |
| GET | `/api/flights/{id}/reviews` | Flight reviews | ❌ |

**Search Request:**
```json
{
  "origin": "Bengaluru (BLR)",
  "destination": "Mumbai (BOM)",
  "travel_date": "2025-01-15",
  "passengers": 2
}
```

### Bookings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/bookings` | Create booking | ✅ |
| GET | `/api/bookings/{id}` | Get booking details | ✅ |
| POST | `/api/bookings/{id}/cancel` | Cancel booking | ✅ |
| GET | `/api/customers/me/bookings` | My bookings | ✅ |

**Create Booking Request:**
```json
{
  "flight_id": 1,
  "passengers": [
    {"name": "John Doe", "age": 30, "seat_pref": "WINDOW"},
    {"name": "Jane Doe", "age": 28, "seat_pref": "AISLE"}
  ],
  "booking_class": "ECONOMY",
  "payment_method": "CREDIT_CARD"
}
```

### Admin Endpoints (Admin Only)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/flights` | Get all flights | 🔒 Admin |
| POST | `/api/admin/flights` | Add new flight | 🔒 Admin |
| POST | `/api/admin/flights/{id}/cancel` | Cancel flight | 🔒 Admin |
| POST | `/api/admin/pricing/refresh/{id}` | Refresh price | 🔒 Admin |
| GET | `/api/admin/analytics/revenue` | Revenue analytics | 🔒 Admin |
| GET | `/api/admin/analytics/routes` | Route analytics | 🔒 Admin |
| GET | `/api/admin/analytics/loyalty` | Loyalty analytics | 🔒 Admin |

**Add Flight Request:**
```json
{
  "flight_code": "FS999",
  "origin": "Bengaluru (BLR)",
  "destination": "Chennai (MAA)",
  "dep_time": "2025-02-01T10:00:00",
  "arr_time": "2025-02-01T11:30:00",
  "base_price": 4500,
  "total_seats": 180,
  "aircraft_no": "VT-ANA"
}
```

**Cancel Flight Request:**
```json
{
  "reason": "Weather conditions"
}
```

---

## Dynamic Pricing Algorithm

The pricing engine calculates prices based on multiple factors:

### Occupancy-Based Surge Multiplier

| Occupancy | Multiplier | Price Effect |
|-----------|------------|--------------|
| < 30% | 0.85x | 15% Discount |
| 30-50% | 1.00x | Base Price |
| 50-70% | 1.25x | 25% Premium |
| 70-85% | 1.50x | 50% Premium |
| > 85% | 2.00x+ | 100%+ Premium |

### Price Calculation Formula

```
Current Price = Base Price × Surge Multiplier × Time Factor × Demand Factor
```

**Factors:**
- **Occupancy Rate:** Primary driver of price changes
- **Time to Departure:** Prices increase as departure approaches
- **Day of Week:** Weekend/holiday premiums
- **Route Demand:** Popular routes have higher base prices
- **Booking Velocity:** Rapid bookings trigger price increases

### Price Bounds

Each flight has `min_price` and `max_price` to prevent extreme pricing:
- Minimum: ~70-80% of base price
- Maximum: 2-4x base price

---

## Loyalty Program

### Tier Structure

| Tier | Points Required | Benefits |
|------|-----------------|----------|
| Bronze | 0 | 1 point per ₹100 spent |
| Silver | 2,000 | 1.25x points multiplier |
| Gold | 5,000 | 1.5x points, priority booking |
| Platinum | 10,000 | 2x points, free upgrades |

### Earning Points

- **Flight Booking:** 1 point per ₹100 spent
- **Tier Multiplier:** Applied based on current tier
- **Bonus Points:** Welcome bonus, birthday bonus, promotions

### Redeeming Points

- **Discount on Booking:** 100 points = ₹100 off
- **Seat Upgrades:** Redeem for premium seats
- **Priority Services:** Lounge access, priority boarding

---

### Customer Portal

**Home Page**
- Hero section with quick flight search
- Featured routes and offers

**Flight Search Results**
- Dynamic pricing badges (High Demand, Great Deal)
- Filters and sorting options

**Booking Flow**
- Passenger details form
- Payment method selection
- Confirmation page

**Dashboard**
- Upcoming flights
- Recent bookings
- Loyalty points summary

### Admin Portal

**Flight Management**
- Add new flights modal
- Cancel flights with reason
- Status filters

**Analytics Dashboard**
- Revenue trend charts
- Booking vs Cancellation graphs
- Payment method distribution
- Route performance table

---

## Project Structure

```
flightsync/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── FlightSearch.jsx
│   │   │   ├── FlightDetails.jsx
│   │   │   ├── customer/
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── MyBookings.jsx
│   │   │   │   ├── BookingDetails.jsx
│   │   │   │   ├── Loyalty.jsx
│   │   │   │   └── Profile.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── FlightManagement.jsx
│   │   │       ├── PricingManagement.jsx
│   │   │       ├── Analytics.jsx
│   │   │       └── CustomerManagement.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── python/
│   ├── app.py              # Main Flask application
│   ├── models.py           # Pydantic models
│   ├── services.py         # Business logic
│   ├── config.py           # Configuration
│   ├── pricing_engine.py   # Dynamic pricing
│   ├── sync_service.py     # MongoDB sync
│   └── requirements.txt
├── sql/
│   ├── 01_schema.sql       # Table definitions
│   ├── 02_triggers.sql     # Database triggers
│   ├── 03_views.sql        # Views
│   ├── 04_sample_data.sql  # Test data
│   └── 05_queries.sql      # Sample queries
├── nosql/
│   └── mongodb_schema.js   # MongoDB collections
├── .env.example
└── README.md
```

---

## Testing

### Test Customer Flow

1. Register a new account or login with demo credentials
2. Search for flights (e.g., Bengaluru → Mumbai)
3. Select a flight and view details
4. Complete booking with payment
5. View booking in "My Bookings"
6. Write a review for completed flights
7. Check loyalty points in dashboard

### Test Admin Flow

1. Login with `admin@flightsync.com` / `admin123`
2. Navigate to Admin Dashboard
3. View analytics and revenue charts
4. Go to Flight Management
5. Add a new flight
6. Cancel an existing flight (observe auto-refund)
7. Refresh dynamic pricing

---

## Deployment

### Production Build

**Frontend:**
```bash
cd frontend
npm run build
# Output in dist/ folder
```

**Backend:**
```bash
cd python
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

### Environment Variables (Production)

```env
FLASK_ENV=production
SECRET_KEY=<strong-random-key>
DB_PASSWORD=<secure-password>
```

---
