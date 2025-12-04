-- ============================================================================
-- FlightSync - Real-Time Dynamic Pricing System for Airlines
-- PostgreSQL Database Schema
-- Team: Astitwa Tanmay, Ayush Aman, Animesh Sapra, Arpita
-- RV College of Engineering, Bengaluru
-- ============================================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS loyalty_transactions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS prices CASCADE;
DROP TABLE IF EXISTS flights CASCADE;
DROP TABLE IF EXISTS aircraft CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- ============================================================================
-- 1. CUSTOMER MANAGEMENT MODULE
-- ============================================================================

-- Customers Table: Core customer profiles and authentication
CREATE TABLE customers (
    cust_id SERIAL PRIMARY KEY,
    fname VARCHAR(50) NOT NULL,
    lname VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(15),
    dob DATE,
    pass_hash VARCHAR(255) NOT NULL,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    loyalty_pts INT DEFAULT 0,
    loyalty_tier VARCHAR(20) DEFAULT 'Bronze' CHECK (loyalty_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loyalty Transactions Table: Audit trail for points earned/spent
CREATE TABLE loyalty_transactions (
    transaction_id SERIAL PRIMARY KEY,
    cust_id INT NOT NULL REFERENCES customers(cust_id) ON DELETE CASCADE,
    points INT NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('EARNED', 'REDEEMED', 'EXPIRED', 'BONUS')),
    description VARCHAR(255),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2. FLIGHT MANAGEMENT MODULE
-- ============================================================================

-- Aircraft Table: Master data for aircraft fleet
CREATE TABLE aircraft (
    aircraft_id SERIAL PRIMARY KEY,
    aircraft_no VARCHAR(20) NOT NULL UNIQUE,
    model VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(50),
    capacity INT NOT NULL CHECK (capacity > 0),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'RETIRED'))
);

-- Flights Table: Flight schedules and availability
CREATE TABLE flights (
    flight_id SERIAL PRIMARY KEY,
    flight_code VARCHAR(10) NOT NULL UNIQUE,
    aircraft_id INT REFERENCES aircraft(aircraft_id),
    origin VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    dep_time TIMESTAMP NOT NULL,
    arr_time TIMESTAMP NOT NULL,
    total_seats INT NOT NULL CHECK (total_seats > 0),
    available_seats INT NOT NULL CHECK (available_seats >= 0),
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED', 'DELAYED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_times CHECK (arr_time > dep_time),
    CONSTRAINT valid_seats CHECK (available_seats <= total_seats)
);

-- Prices Table: Dynamic pricing for each flight
CREATE TABLE prices (
    price_id SERIAL PRIMARY KEY,
    flight_id INT NOT NULL UNIQUE REFERENCES flights(flight_id) ON DELETE CASCADE,
    base_price DECIMAL(10, 2) NOT NULL CHECK (base_price > 0),
    current_price DECIMAL(10, 2) NOT NULL CHECK (current_price > 0),
    surge_multiplier DECIMAL(4, 2) DEFAULT 1.00 CHECK (surge_multiplier >= 0.5 AND surge_multiplier <= 5.0),
    min_price DECIMAL(10, 2),
    max_price DECIMAL(10, 2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. BOOKING & PAYMENT MODULE
-- ============================================================================

-- Bookings Table: Central transactional entity (M:N between Customers and Flights)
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    cust_id INT NOT NULL REFERENCES customers(cust_id) ON DELETE CASCADE,
    flight_id INT NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    seats_booked INT NOT NULL DEFAULT 1 CHECK (seats_booked > 0),
    total_cost DECIMAL(12, 2) NOT NULL,
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED')),
    booking_class VARCHAR(20) DEFAULT 'ECONOMY' CHECK (booking_class IN ('ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST')),
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table: Payment records for bookings
CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    cust_id INT NOT NULL REFERENCES customers(cust_id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('CREDIT_CARD', 'DEBIT_CARD', 'UPI', 'NET_BANKING', 'WALLET', 'LOYALTY_POINTS')),
    transaction_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED')),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. REVIEW & FEEDBACK MODULE
-- ============================================================================

-- Reviews Table: Customer reviews for flights
CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    flight_id INT NOT NULL REFERENCES flights(flight_id) ON DELETE CASCADE,
    cust_id INT NOT NULL REFERENCES customers(cust_id) ON DELETE CASCADE,
    booking_id INT REFERENCES bookings(booking_id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(100),
    comment TEXT,
    meal_rating INT CHECK (meal_rating >= 1 AND meal_rating <= 5),
    service_rating INT CHECK (service_rating >= 1 AND service_rating <= 5),
    comfort_rating INT CHECK (comfort_rating >= 1 AND comfort_rating <= 5),
    helpful_count INT DEFAULT 0,
    review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'PUBLISHED' CHECK (status IN ('PENDING', 'PUBLISHED', 'HIDDEN')),
    UNIQUE(cust_id, booking_id)  -- One review per booking
);

-- ============================================================================
-- 5. INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Customer indexes
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_loyalty_tier ON customers(loyalty_tier);

-- Flight indexes
CREATE INDEX idx_flights_origin_dest ON flights(origin, destination);
CREATE INDEX idx_flights_dep_time ON flights(dep_time);
CREATE INDEX idx_flights_status ON flights(status);
CREATE INDEX idx_flights_available_seats ON flights(available_seats);

-- Booking indexes
CREATE INDEX idx_bookings_cust_id ON bookings(cust_id);
CREATE INDEX idx_bookings_flight_id ON bookings(flight_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_date ON bookings(booking_date);

-- Payment indexes
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);

-- Review indexes
CREATE INDEX idx_reviews_flight_id ON reviews(flight_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- Price indexes
CREATE INDEX idx_prices_flight_id ON prices(flight_id);

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE customers IS 'Stores customer profiles, authentication, and loyalty information';
COMMENT ON TABLE flights IS 'Master flight schedule data with real-time seat availability';
COMMENT ON TABLE bookings IS 'Central booking transactions linking customers to flights';
COMMENT ON TABLE payments IS 'Payment records with multiple payment method support';
COMMENT ON TABLE prices IS 'Dynamic pricing data with surge multiplier support';
COMMENT ON TABLE reviews IS 'Customer feedback and ratings for flights';
COMMENT ON TABLE loyalty_transactions IS 'Audit trail for loyalty points transactions';
COMMENT ON TABLE aircraft IS 'Aircraft fleet master data';
