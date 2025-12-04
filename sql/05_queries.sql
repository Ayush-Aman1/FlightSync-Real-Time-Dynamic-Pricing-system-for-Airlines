-- ============================================================================
-- FlightSync - Common Queries and Stored Procedures
-- Frequently used operations for the airline system
-- ============================================================================

-- ============================================================================
-- 1. FLIGHT SEARCH QUERIES
-- ============================================================================

-- Search available flights between two cities
-- Usage: Call with origin, destination, and date
CREATE OR REPLACE FUNCTION search_flights(
    p_origin VARCHAR,
    p_destination VARCHAR,
    p_date DATE,
    p_passengers INT DEFAULT 1
)
RETURNS TABLE (
    flight_id INT,
    flight_code VARCHAR,
    origin VARCHAR,
    destination VARCHAR,
    departure TIMESTAMP,
    arrival TIMESTAMP,
    duration_hours NUMERIC,
    available_seats INT,
    current_price DECIMAL,
    price_tier VARCHAR,
    aircraft_model VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.flight_id,
        f.flight_code,
        f.origin,
        f.destination,
        f.dep_time,
        f.arr_time,
        ROUND(EXTRACT(EPOCH FROM (f.arr_time - f.dep_time))/3600, 2),
        f.available_seats,
        p.current_price,
        CASE 
            WHEN p.surge_multiplier < 1 THEN 'DISCOUNTED'
            WHEN p.surge_multiplier = 1 THEN 'NORMAL'
            WHEN p.surge_multiplier <= 1.5 THEN 'MODERATE'
            ELSE 'HIGH_DEMAND'
        END::VARCHAR,
        a.model
    FROM flights f
    JOIN prices p ON f.flight_id = p.flight_id
    LEFT JOIN aircraft a ON f.aircraft_id = a.aircraft_id
    WHERE f.origin ILIKE '%' || p_origin || '%'
      AND f.destination ILIKE '%' || p_destination || '%'
      AND DATE(f.dep_time) = p_date
      AND f.available_seats >= p_passengers
      AND f.status = 'SCHEDULED'
    ORDER BY f.dep_time;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM search_flights('Bengaluru', 'Mumbai', '2025-01-15', 2);

-- ============================================================================
-- 2. BOOKING OPERATIONS
-- ============================================================================

-- Create a new booking with automatic price calculation
CREATE OR REPLACE FUNCTION create_booking(
    p_cust_id INT,
    p_flight_id INT,
    p_seats INT,
    p_booking_class VARCHAR DEFAULT 'ECONOMY'
)
RETURNS TABLE (
    booking_id INT,
    total_cost DECIMAL,
    message VARCHAR
) AS $$
DECLARE
    v_booking_id INT;
    v_current_price DECIMAL;
    v_total_cost DECIMAL;
    v_class_multiplier DECIMAL;
BEGIN
    -- Get current price
    SELECT current_price INTO v_current_price
    FROM prices WHERE flight_id = p_flight_id;
    
    -- Apply class multiplier
    v_class_multiplier := CASE p_booking_class
        WHEN 'ECONOMY' THEN 1.0
        WHEN 'PREMIUM_ECONOMY' THEN 1.5
        WHEN 'BUSINESS' THEN 2.5
        WHEN 'FIRST' THEN 4.0
        ELSE 1.0
    END;
    
    v_total_cost := v_current_price * p_seats * v_class_multiplier;
    
    -- Insert booking (triggers will handle seat updates and loyalty points)
    INSERT INTO bookings (cust_id, flight_id, seats_booked, total_cost, booking_class, status)
    VALUES (p_cust_id, p_flight_id, p_seats, v_total_cost, p_booking_class, 'CONFIRMED')
    RETURNING bookings.booking_id INTO v_booking_id;
    
    RETURN QUERY SELECT v_booking_id, v_total_cost, 'Booking confirmed successfully'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM create_booking(1, 1, 2, 'ECONOMY');

-- Cancel a booking
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id INT,
    p_reason VARCHAR DEFAULT 'Customer requested cancellation'
)
RETURNS VARCHAR AS $$
DECLARE
    v_status VARCHAR;
BEGIN
    SELECT status INTO v_status FROM bookings WHERE booking_id = p_booking_id;
    
    IF v_status IS NULL THEN
        RETURN 'Booking not found';
    END IF;
    
    IF v_status IN ('CANCELLED', 'REFUNDED') THEN
        RETURN 'Booking is already cancelled';
    END IF;
    
    IF v_status = 'COMPLETED' THEN
        RETURN 'Cannot cancel a completed booking';
    END IF;
    
    -- Update booking status (triggers will restore seats and update pricing)
    UPDATE bookings 
    SET status = 'CANCELLED',
        special_requests = COALESCE(special_requests, '') || ' | Cancelled: ' || p_reason
    WHERE booking_id = p_booking_id;
    
    RETURN 'Booking cancelled successfully';
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT cancel_booking(8, 'Change of travel plans');

-- ============================================================================
-- 3. CUSTOMER QUERIES
-- ============================================================================

-- Get customer dashboard data
CREATE OR REPLACE FUNCTION get_customer_dashboard(p_cust_id INT)
RETURNS TABLE (
    customer_name VARCHAR,
    email VARCHAR,
    loyalty_tier VARCHAR,
    loyalty_points INT,
    wallet_balance DECIMAL,
    total_bookings BIGINT,
    upcoming_flights BIGINT,
    total_spent DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (c.fname || ' ' || c.lname)::VARCHAR,
        c.email,
        c.loyalty_tier,
        c.loyalty_pts,
        c.balance,
        COUNT(DISTINCT b.booking_id),
        COUNT(DISTINCT CASE WHEN f.dep_time > CURRENT_TIMESTAMP AND b.status = 'CONFIRMED' THEN b.booking_id END),
        COALESCE(SUM(CASE WHEN b.status IN ('CONFIRMED', 'COMPLETED') THEN b.total_cost ELSE 0 END), 0)
    FROM customers c
    LEFT JOIN bookings b ON c.cust_id = b.cust_id
    LEFT JOIN flights f ON b.flight_id = f.flight_id
    WHERE c.cust_id = p_cust_id
    GROUP BY c.cust_id, c.fname, c.lname, c.email, c.loyalty_tier, c.loyalty_pts, c.balance;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM get_customer_dashboard(1);

-- Get upcoming bookings for a customer
CREATE OR REPLACE FUNCTION get_upcoming_bookings(p_cust_id INT)
RETURNS TABLE (
    booking_id INT,
    flight_code VARCHAR,
    origin VARCHAR,
    destination VARCHAR,
    departure TIMESTAMP,
    seats_booked INT,
    booking_class VARCHAR,
    total_cost DECIMAL,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.booking_id,
        f.flight_code,
        f.origin,
        f.destination,
        f.dep_time,
        b.seats_booked,
        b.booking_class,
        b.total_cost,
        b.status
    FROM bookings b
    JOIN flights f ON b.flight_id = f.flight_id
    WHERE b.cust_id = p_cust_id
      AND f.dep_time > CURRENT_TIMESTAMP
      AND b.status = 'CONFIRMED'
    ORDER BY f.dep_time;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM get_upcoming_bookings(1);

-- ============================================================================
-- 4. PRICING QUERIES
-- ============================================================================

-- Get price trend for a route (for MongoDB sync reference)
CREATE OR REPLACE FUNCTION get_route_pricing(
    p_origin VARCHAR,
    p_destination VARCHAR
)
RETURNS TABLE (
    flight_code VARCHAR,
    departure_date DATE,
    base_price DECIMAL,
    current_price DECIMAL,
    surge_multiplier DECIMAL,
    available_seats INT,
    occupancy_percent NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.flight_code,
        DATE(f.dep_time),
        p.base_price,
        p.current_price,
        p.surge_multiplier,
        f.available_seats,
        ROUND(((f.total_seats - f.available_seats)::DECIMAL / f.total_seats) * 100, 2)
    FROM flights f
    JOIN prices p ON f.flight_id = p.flight_id
    WHERE f.origin ILIKE '%' || p_origin || '%'
      AND f.destination ILIKE '%' || p_destination || '%'
      AND f.dep_time > CURRENT_TIMESTAMP
    ORDER BY f.dep_time;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM get_route_pricing('Bengaluru', 'Mumbai');

-- Manual price adjustment (admin function)
CREATE OR REPLACE FUNCTION adjust_price(
    p_flight_id INT,
    p_new_multiplier DECIMAL
)
RETURNS VARCHAR AS $$
DECLARE
    v_base_price DECIMAL;
BEGIN
    IF p_new_multiplier < 0.5 OR p_new_multiplier > 5.0 THEN
        RETURN 'Multiplier must be between 0.5 and 5.0';
    END IF;
    
    SELECT base_price INTO v_base_price FROM prices WHERE flight_id = p_flight_id;
    
    IF v_base_price IS NULL THEN
        RETURN 'Flight not found';
    END IF;
    
    UPDATE prices 
    SET surge_multiplier = p_new_multiplier,
        current_price = v_base_price * p_new_multiplier,
        last_updated = CURRENT_TIMESTAMP
    WHERE flight_id = p_flight_id;
    
    RETURN 'Price updated successfully. New price: ' || (v_base_price * p_new_multiplier);
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT adjust_price(1, 1.25);

-- ============================================================================
-- 5. ANALYTICS QUERIES
-- ============================================================================

-- Revenue report by date range
CREATE OR REPLACE FUNCTION get_revenue_report(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    report_date DATE,
    total_bookings BIGINT,
    total_seats BIGINT,
    total_revenue DECIMAL,
    avg_booking_value DECIMAL,
    cancellation_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(booking_date),
        COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')),
        SUM(seats_booked) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')),
        SUM(total_cost) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')),
        ROUND(AVG(total_cost) FILTER (WHERE status IN ('CONFIRMED', 'COMPLETED')), 2),
        COUNT(*) FILTER (WHERE status = 'CANCELLED')
    FROM bookings
    WHERE DATE(booking_date) BETWEEN p_start_date AND p_end_date
    GROUP BY DATE(booking_date)
    ORDER BY DATE(booking_date);
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM get_revenue_report('2025-01-01', '2025-01-31');

-- Top routes by revenue
CREATE OR REPLACE FUNCTION get_top_routes(p_limit INT DEFAULT 10)
RETURNS TABLE (
    route VARCHAR,
    flight_count BIGINT,
    total_bookings BIGINT,
    total_revenue DECIMAL,
    avg_occupancy NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (f.origin || ' → ' || f.destination)::VARCHAR,
        COUNT(DISTINCT f.flight_id),
        COUNT(b.booking_id),
        COALESCE(SUM(b.total_cost), 0),
        ROUND(AVG((f.total_seats - f.available_seats)::DECIMAL / f.total_seats * 100), 2)
    FROM flights f
    LEFT JOIN bookings b ON f.flight_id = b.flight_id AND b.status IN ('CONFIRMED', 'COMPLETED')
    GROUP BY f.origin, f.destination
    ORDER BY SUM(b.total_cost) DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM get_top_routes(5);

-- ============================================================================
-- 6. REVIEW OPERATIONS
-- ============================================================================

-- Submit a review
CREATE OR REPLACE FUNCTION submit_review(
    p_flight_id INT,
    p_cust_id INT,
    p_booking_id INT,
    p_rating INT,
    p_title VARCHAR,
    p_comment TEXT,
    p_meal_rating INT DEFAULT NULL,
    p_service_rating INT DEFAULT NULL,
    p_comfort_rating INT DEFAULT NULL
)
RETURNS VARCHAR AS $$
DECLARE
    v_booking_status VARCHAR;
BEGIN
    -- Verify booking belongs to customer and is completed
    SELECT status INTO v_booking_status
    FROM bookings 
    WHERE booking_id = p_booking_id 
      AND cust_id = p_cust_id 
      AND flight_id = p_flight_id;
    
    IF v_booking_status IS NULL THEN
        RETURN 'Invalid booking for this customer and flight';
    END IF;
    
    IF v_booking_status NOT IN ('CONFIRMED', 'COMPLETED') THEN
        RETURN 'Can only review confirmed or completed bookings';
    END IF;
    
    -- Check for existing review
    IF EXISTS (SELECT 1 FROM reviews WHERE cust_id = p_cust_id AND booking_id = p_booking_id) THEN
        RETURN 'You have already reviewed this booking';
    END IF;
    
    INSERT INTO reviews (flight_id, cust_id, booking_id, rating, title, comment, 
                         meal_rating, service_rating, comfort_rating)
    VALUES (p_flight_id, p_cust_id, p_booking_id, p_rating, p_title, p_comment,
            p_meal_rating, p_service_rating, p_comfort_rating);
    
    -- Award bonus points for review
    UPDATE customers SET loyalty_pts = loyalty_pts + 25 WHERE cust_id = p_cust_id;
    INSERT INTO loyalty_transactions (cust_id, points, transaction_type, description)
    VALUES (p_cust_id, 25, 'BONUS', 'Points for submitting review');
    
    RETURN 'Review submitted successfully. 25 bonus points awarded!';
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT submit_review(1, 1, 1, 4, 'Great flight!', 'Very comfortable journey', 4, 5, 4);

-- Get flight reviews
CREATE OR REPLACE FUNCTION get_flight_reviews(p_flight_id INT)
RETURNS TABLE (
    review_id INT,
    customer_name VARCHAR,
    rating INT,
    title VARCHAR,
    comment TEXT,
    meal_rating INT,
    service_rating INT,
    comfort_rating INT,
    helpful_count INT,
    review_date TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.review_id,
        (c.fname || ' ' || LEFT(c.lname, 1) || '.')::VARCHAR,
        r.rating,
        r.title,
        r.comment,
        r.meal_rating,
        r.service_rating,
        r.comfort_rating,
        r.helpful_count,
        r.review_date
    FROM reviews r
    JOIN customers c ON r.cust_id = c.cust_id
    WHERE r.flight_id = p_flight_id
      AND r.status = 'PUBLISHED'
    ORDER BY r.helpful_count DESC, r.review_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM get_flight_reviews(1);

-- ============================================================================
-- 7. LOYALTY PROGRAM QUERIES
-- ============================================================================

-- Redeem loyalty points
CREATE OR REPLACE FUNCTION redeem_points(
    p_cust_id INT,
    p_points INT,
    p_description VARCHAR
)
RETURNS VARCHAR AS $$
DECLARE
    v_current_points INT;
BEGIN
    SELECT loyalty_pts INTO v_current_points FROM customers WHERE cust_id = p_cust_id;
    
    IF v_current_points < p_points THEN
        RETURN 'Insufficient points. Available: ' || v_current_points;
    END IF;
    
    UPDATE customers 
    SET loyalty_pts = loyalty_pts - p_points 
    WHERE cust_id = p_cust_id;
    
    INSERT INTO loyalty_transactions (cust_id, points, transaction_type, description)
    VALUES (p_cust_id, p_points, 'REDEEMED', p_description);
    
    RETURN 'Successfully redeemed ' || p_points || ' points. Remaining: ' || (v_current_points - p_points);
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT redeem_points(1, 500, 'Upgrade to Business class');

-- Get loyalty transaction history
CREATE OR REPLACE FUNCTION get_loyalty_history(p_cust_id INT, p_limit INT DEFAULT 20)
RETURNS TABLE (
    transaction_date TIMESTAMP,
    points INT,
    type VARCHAR,
    description VARCHAR,
    running_balance INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lt.created_at,
        lt.points,
        lt.transaction_type,
        lt.description,
        SUM(CASE WHEN lt.transaction_type IN ('EARNED', 'BONUS') THEN lt.points ELSE -lt.points END) 
            OVER (ORDER BY lt.created_at)::INT
    FROM loyalty_transactions lt
    WHERE lt.cust_id = p_cust_id
    ORDER BY lt.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Example: SELECT * FROM get_loyalty_history(1, 10);
