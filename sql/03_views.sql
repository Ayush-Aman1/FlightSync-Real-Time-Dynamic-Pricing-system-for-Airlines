-- ============================================================================
-- FlightSync - Views for Analytics and Common Queries
-- ============================================================================

-- ============================================================================
-- 1. FLIGHT SEARCH VIEW
-- Comprehensive flight information for search results
-- ============================================================================

CREATE OR REPLACE VIEW vw_flight_search AS
SELECT 
    f.flight_id,
    f.flight_code,
    f.origin,
    f.destination,
    f.dep_time,
    f.arr_time,
    EXTRACT(EPOCH FROM (f.arr_time - f.dep_time))/3600 AS duration_hours,
    f.total_seats,
    f.available_seats,
    f.status AS flight_status,
    a.model AS aircraft_model,
    a.manufacturer AS aircraft_manufacturer,
    p.base_price,
    p.current_price,
    p.surge_multiplier,
    ROUND(((f.total_seats - f.available_seats)::DECIMAL / f.total_seats) * 100, 2) AS occupancy_percentage,
    CASE 
        WHEN p.surge_multiplier < 1 THEN 'DISCOUNTED'
        WHEN p.surge_multiplier = 1 THEN 'NORMAL'
        WHEN p.surge_multiplier <= 1.5 THEN 'MODERATE_DEMAND'
        WHEN p.surge_multiplier <= 2 THEN 'HIGH_DEMAND'
        ELSE 'PREMIUM'
    END AS pricing_tier
FROM flights f
LEFT JOIN aircraft a ON f.aircraft_id = a.aircraft_id
LEFT JOIN prices p ON f.flight_id = p.flight_id
WHERE f.status NOT IN ('CANCELLED', 'ARRIVED');

-- ============================================================================
-- 2. CUSTOMER BOOKING HISTORY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW vw_customer_booking_history AS
SELECT 
    c.cust_id,
    c.fname || ' ' || c.lname AS customer_name,
    c.email,
    c.loyalty_tier,
    c.loyalty_pts,
    b.booking_id,
    b.booking_date,
    b.seats_booked,
    b.total_cost,
    b.status AS booking_status,
    b.booking_class,
    f.flight_code,
    f.origin,
    f.destination,
    f.dep_time,
    f.arr_time,
    pay.payment_method,
    pay.status AS payment_status
FROM customers c
JOIN bookings b ON c.cust_id = b.cust_id
JOIN flights f ON b.flight_id = f.flight_id
LEFT JOIN payments pay ON b.booking_id = pay.booking_id
ORDER BY b.booking_date DESC;

-- ============================================================================
-- 3. REVENUE ANALYTICS VIEW
-- Daily/Route-wise revenue analysis
-- ============================================================================

CREATE OR REPLACE VIEW vw_revenue_analytics AS
SELECT 
    DATE(b.booking_date) AS booking_day,
    f.origin,
    f.destination,
    f.flight_code,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    SUM(b.seats_booked) AS total_seats_sold,
    SUM(b.total_cost) AS total_revenue,
    AVG(b.total_cost / b.seats_booked) AS avg_price_per_seat,
    SUM(CASE WHEN b.booking_class = 'ECONOMY' THEN b.seats_booked ELSE 0 END) AS economy_seats,
    SUM(CASE WHEN b.booking_class = 'BUSINESS' THEN b.seats_booked ELSE 0 END) AS business_seats,
    SUM(CASE WHEN b.booking_class = 'FIRST' THEN b.seats_booked ELSE 0 END) AS first_class_seats
FROM bookings b
JOIN flights f ON b.flight_id = f.flight_id
WHERE b.status IN ('CONFIRMED', 'COMPLETED')
GROUP BY DATE(b.booking_date), f.origin, f.destination, f.flight_code
ORDER BY booking_day DESC, total_revenue DESC;

-- ============================================================================
-- 4. FLIGHT REVIEWS SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW vw_flight_reviews_summary AS
SELECT 
    f.flight_id,
    f.flight_code,
    f.origin,
    f.destination,
    COUNT(r.review_id) AS total_reviews,
    ROUND(AVG(r.rating), 2) AS avg_rating,
    ROUND(AVG(r.meal_rating), 2) AS avg_meal_rating,
    ROUND(AVG(r.service_rating), 2) AS avg_service_rating,
    ROUND(AVG(r.comfort_rating), 2) AS avg_comfort_rating,
    SUM(r.helpful_count) AS total_helpful_votes,
    COUNT(CASE WHEN r.rating >= 4 THEN 1 END) AS positive_reviews,
    COUNT(CASE WHEN r.rating <= 2 THEN 1 END) AS negative_reviews
FROM flights f
LEFT JOIN reviews r ON f.flight_id = r.flight_id AND r.status = 'PUBLISHED'
GROUP BY f.flight_id, f.flight_code, f.origin, f.destination;

-- ============================================================================
-- 5. LOYALTY PROGRAM ANALYTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW vw_loyalty_analytics AS
SELECT 
    c.cust_id,
    c.fname || ' ' || c.lname AS customer_name,
    c.email,
    c.loyalty_tier,
    c.loyalty_pts AS current_points,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    SUM(b.total_cost) AS lifetime_value,
    SUM(CASE WHEN lt.transaction_type = 'EARNED' THEN lt.points ELSE 0 END) AS total_earned,
    SUM(CASE WHEN lt.transaction_type = 'REDEEMED' THEN lt.points ELSE 0 END) AS total_redeemed,
    MAX(b.booking_date) AS last_booking_date,
    CASE 
        WHEN MAX(b.booking_date) > CURRENT_DATE - INTERVAL '30 days' THEN 'ACTIVE'
        WHEN MAX(b.booking_date) > CURRENT_DATE - INTERVAL '90 days' THEN 'ENGAGED'
        WHEN MAX(b.booking_date) > CURRENT_DATE - INTERVAL '180 days' THEN 'AT_RISK'
        ELSE 'CHURNED'
    END AS engagement_status
FROM customers c
LEFT JOIN bookings b ON c.cust_id = b.cust_id AND b.status IN ('CONFIRMED', 'COMPLETED')
LEFT JOIN loyalty_transactions lt ON c.cust_id = lt.cust_id
GROUP BY c.cust_id, c.fname, c.lname, c.email, c.loyalty_tier, c.loyalty_pts;

-- ============================================================================
-- 6. ROUTE PERFORMANCE VIEW
-- ============================================================================

CREATE OR REPLACE VIEW vw_route_performance AS
SELECT 
    f.origin,
    f.destination,
    COUNT(DISTINCT f.flight_id) AS total_flights,
    AVG(f.total_seats - f.available_seats) AS avg_seats_sold,
    ROUND(AVG((f.total_seats - f.available_seats)::DECIMAL / f.total_seats * 100), 2) AS avg_occupancy,
    SUM(b.total_cost) AS route_revenue,
    COUNT(DISTINCT b.booking_id) AS total_bookings,
    ROUND(AVG(p.current_price), 2) AS avg_current_price,
    ROUND(AVG(p.surge_multiplier), 2) AS avg_surge_multiplier
FROM flights f
LEFT JOIN bookings b ON f.flight_id = b.flight_id AND b.status IN ('CONFIRMED', 'COMPLETED')
LEFT JOIN prices p ON f.flight_id = p.flight_id
GROUP BY f.origin, f.destination
ORDER BY route_revenue DESC NULLS LAST;

-- ============================================================================
-- 7. PAYMENT SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW vw_payment_summary AS
SELECT 
    DATE(payment_date) AS payment_day,
    payment_method,
    COUNT(*) AS transaction_count,
    SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) AS successful,
    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
    SUM(CASE WHEN status = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded,
    SUM(CASE WHEN status = 'SUCCESS' THEN amount ELSE 0 END) AS total_collected,
    ROUND(AVG(CASE WHEN status = 'SUCCESS' THEN amount END), 2) AS avg_transaction_value
FROM payments
GROUP BY DATE(payment_date), payment_method
ORDER BY payment_day DESC, total_collected DESC;

-- ============================================================================
-- 8. PRICING HISTORY SNAPSHOT (For MongoDB sync reference)
-- ============================================================================

CREATE OR REPLACE VIEW vw_price_snapshot AS
SELECT 
    p.flight_id,
    f.flight_code,
    f.available_seats,
    f.total_seats,
    p.base_price,
    p.current_price,
    p.surge_multiplier,
    p.last_updated,
    ROUND(((f.total_seats - f.available_seats)::DECIMAL / f.total_seats) * 100, 2) AS occupancy_rate
FROM prices p
JOIN flights f ON p.flight_id = f.flight_id;
