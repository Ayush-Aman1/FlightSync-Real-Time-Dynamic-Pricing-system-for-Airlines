# FlightSync - Real-Time Dynamic Pricing System for Airlines

## 🛫 Project Overview

FlightSync is an intelligent airline pricing and booking platform that combines traditional relational database management (PostgreSQL) with NoSQL flexibility (MongoDB) for real-time analytics. The system features dynamic pricing based on demand, customer behavior tracking, and AI-powered insights.

**Team Members:**
- Astitwa Tanmay (1RV23CS056)
- Ayush Aman (1RV23CS059)
- Animesh Sapra (1RV23CS036)
- Arpita (1RV23CS048)

**Institution:** RV College of Engineering, Bengaluru  
**Course:** Database Management Systems (CD252IA)

---

## 📁 Project Structure

```
flightsync/
├── sql/                          # PostgreSQL database files
│   ├── 01_schema.sql            # Table definitions
│   ├── 02_triggers.sql          # Triggers and functions
│   ├── 03_views.sql             # Views for analytics
│   ├── 04_sample_data.sql       # Sample data for testing
│   └── 05_queries.sql           # Stored procedures & common queries
├── nosql/                        # MongoDB configuration
│   └── mongodb_schema.js        # Collection schemas and indexes
├── python/                       # Python application
│   ├── app.py                   # Flask REST API
│   ├── config.py                # Configuration & DB connections
│   ├── models.py                # Pydantic data models
│   ├── services.py              # Business logic layer
│   ├── pricing_engine.py        # Dynamic pricing algorithm
│   ├── sync_service.py          # PostgreSQL to MongoDB sync
│   └── requirements.txt         # Python dependencies
├── docs/                         # Documentation
└── .env.example                  # Environment variables template
```

---

## 🏗️ Architecture

### Hybrid Database Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                         │
│                     (Flask REST API + Python)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         ▼                                         ▼
┌─────────────────────┐                 ┌─────────────────────┐
│    PostgreSQL       │                 │      MongoDB        │
│  (Transactional)    │ ◄── Sync ───►  │    (Analytics)      │
├─────────────────────┤                 ├─────────────────────┤
│ • Customers         │                 │ • Price History     │
│ • Flights           │                 │ • Customer Behavior │
│ • Bookings          │                 │ • Flight Reviews    │
│ • Payments          │                 │ • AI Insights       │
│ • Prices            │                 │ • Cached Data       │
│ • Loyalty           │                 │                     │
└─────────────────────┘                 └─────────────────────┘
```

### Key Features

1. **Dynamic Pricing Engine**
   - Surge pricing based on seat occupancy
   - Time-to-departure multipliers
   - Seasonal and day-of-week factors
   - Automatic price updates via triggers

2. **Loyalty Program**
   - Points earned on bookings (1 point per ₹100)
   - Tier system: Bronze → Silver → Gold → Platinum
   - Automatic tier upgrades

3. **Real-time Sync**
   - PostgreSQL triggers notify MongoDB sync service
   - Price history tracking
   - Customer behavior logging

4. **Analytics & Insights**
   - Revenue reports
   - Route performance
   - Abandoned cart tracking
   - AI pricing recommendations

---

## 🚀 Setup Instructions

### Prerequisites

- PostgreSQL 14+
- MongoDB 6.0+
- Python 3.10+
- pip (Python package manager)

### 1. Database Setup

#### PostgreSQL

```bash
# Create database
createdb flightsync

# Run SQL scripts in order
psql -d flightsync -f sql/01_schema.sql
psql -d flightsync -f sql/02_triggers.sql
psql -d flightsync -f sql/03_views.sql
psql -d flightsync -f sql/04_sample_data.sql
psql -d flightsync -f sql/05_queries.sql
```

#### MongoDB

```bash
# Start MongoDB shell
mongosh

# Switch to database
use flightsync

# Run schema script
load("nosql/mongodb_schema.js")
```

### 2. Python Application Setup

```bash
cd python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your database credentials

# Run the application
python app.py
```

### 3. Start Sync Service (Optional)

```bash
# In a separate terminal
python sync_service.py

# For initial bulk sync
python sync_service.py --bulk
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new customer |
| POST | `/api/auth/login` | Customer login |

### Flights
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/flights/search` | Search available flights |
| GET | `/api/flights/{id}` | Get flight details |
| GET | `/api/flights/{id}/price-history` | Get price history |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings/{id}` | Get booking details |
| GET | `/api/bookings/upcoming` | Get upcoming bookings |
| POST | `/api/bookings/{id}/cancel` | Cancel booking |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Process payment |
| GET | `/api/payments/{id}` | Get payment details |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/reviews` | Submit review |
| GET | `/api/flights/{id}/reviews` | Get flight reviews |

### Admin/Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/pricing/refresh/{id}` | Refresh flight price |
| POST | `/api/admin/pricing/refresh-all` | Refresh all prices |
| GET | `/api/admin/pricing/insights/{id}` | Get AI pricing insights |
| GET | `/api/admin/analytics/revenue` | Revenue report |
| GET | `/api/admin/analytics/routes` | Top routes |

---

## 🔧 Dynamic Pricing Algorithm

The pricing engine uses multiple factors to calculate surge multipliers:

```
Final Price = Base Price × Surge Multiplier

Surge Multiplier = weighted_average(
    0.40 × Occupancy Factor,
    0.30 × Days-to-Departure Factor,
    0.10 × Time-of-Day Factor,
    0.10 × Day-of-Week Factor,
    0.10 × Seasonal Factor
)
```

### Occupancy Thresholds
| Occupancy | Multiplier |
|-----------|------------|
| < 30% | 0.85 (discount) |
| 30-50% | 1.00 (normal) |
| 50-70% | 1.25 |
| 70-85% | 1.50 |
| 85-95% | 2.00 |
| > 95% | 2.50 (premium) |

---

## 📊 Sample Queries

### Search Flights
```sql
SELECT * FROM search_flights('Bengaluru', 'Mumbai', '2025-01-15', 2);
```

### Create Booking
```sql
SELECT * FROM create_booking(1, 1, 2, 'ECONOMY');
```

### Get Revenue Report
```sql
SELECT * FROM get_revenue_report('2025-01-01', '2025-01-31');
```

### Get Price Trends (MongoDB)
```javascript
db.price_history.aggregate([
  { $match: { flight_id: 1 } },
  { $unwind: "$price_snapshots" },
  { $sort: { "price_snapshots.timestamp": -1 } },
  { $limit: 10 }
])
```

---

## 🔐 Security Features

- Password hashing (SHA-256)
- JWT-based authentication
- Input validation with Pydantic
- SQL injection prevention via parameterized queries
- CORS configuration

---

## 📈 Future Enhancements

- [ ] Machine Learning for demand prediction
- [ ] Real-time competitor price monitoring
- [ ] Mobile application
- [ ] Email/SMS notifications
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support

---

## 📚 References

1. Talluri, K. T., & Van Ryzin, G. J. (2004). *The Theory and Practice of Revenue Management*. Springer.
2. Boden, M., & Zdonik, S. (2020). Polyglot persistence: Choosing the right database for the right job.
3. Dynamic airline pricing research using MDP approach.

---

## 📄 License

This project is developed for academic purposes as part of the DBMS course at RV College of Engineering.

---

**Made with ❤️ by Team FlightSync**
