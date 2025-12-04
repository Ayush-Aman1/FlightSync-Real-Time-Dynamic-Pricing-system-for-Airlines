-- ============================================================================
-- FlightSync - Triggers and Functions
-- Automatic seat management, dynamic pricing, and loyalty points
-- ============================================================================

-- ============================================================================
-- 1. DYNAMIC PRICING FUNCTION
-- Calculates surge multiplier based on seat occupancy and demand
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_surge_multiplier(
    p_available_seats INT,
    p_total_seats INT
) RETURNS DECIMAL(4,2) AS $$
DECLARE
    occupancy_rate DECIMAL(5,4);
    surge DECIMAL(4,2);
BEGIN
    -- Calculate occupancy rate (0 to 1)
    occupancy_rate := 1.0 - (p_available_seats::DECIMAL / p_total_seats::DECIMAL);
    
    -- Dynamic surge calculation based on occupancy thresholds
    -- More aggressive pricing as seats fill up
    CASE
        WHEN occupancy_rate < 0.3 THEN surge := 0.85;   -- Low demand: discount
        WHEN occupancy_rate < 0.5 THEN surge := 1.00;   -- Normal pricing
        WHEN occupancy_rate < 0.7 THEN surge := 1.25;   -- Moderate demand
        WHEN occupancy_rate < 0.85 THEN surge := 1.50;  -- High demand
        WHEN occupancy_rate < 0.95 THEN surge := 2.00;  -- Very high demand
        ELSE surge := 2.50;                              -- Last few seats premium
    END CASE;
    
    RETURN surge;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. UPDATE PRICE AFTER BOOKING TRIGGER
-- Automatically adjusts prices and seats when a booking is made
-- ============================================================================

CREATE OR REPLACE FUNCTION update_flight_after_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_available_seats INT;
    v_total_seats INT;
    v_new_surge DECIMAL(4,2);
    v_base_price DECIMAL(10,2);
    v_new_price DECIMAL(10,2);
    v_points_earned INT;
BEGIN
    -- Only process for new confirmed bookings
    IF TG_OP = 'INSERT' AND NEW.status IN ('CONFIRMED', 'PENDING') THEN
        
        -- 1. Update available seats in flights table
        UPDATE flights 
        SET available_seats = available_seats - NEW.seats_booked,
            updated_at = CURRENT_TIMESTAMP
        WHERE flight_id = NEW.flight_id
        RETURNING available_seats, total_seats INTO v_available_seats, v_total_seats;
        
        -- Validate seats are available
        IF v_available_seats < 0 THEN
            RAISE EXCEPTION 'Not enough seats available for this booking';
        END IF;
        
        -- 2. Calculate new surge multiplier
        v_new_surge := calculate_surge_multiplier(v_available_seats, v_total_seats);
        
        -- 3. Update prices table with new surge and current price
        SELECT base_price INTO v_base_price FROM prices WHERE flight_id = NEW.flight_id;
        v_new_price := v_base_price * v_new_surge;
        
        UPDATE prices 
        SET surge_multiplier = v_new_surge,
            current_price = v_new_price,
            last_updated = CURRENT_TIMESTAMP
        WHERE flight_id = NEW.flight_id;
        
        -- 4. Award loyalty points (1 point per 100 rupees spent)
        v_points_earned := FLOOR(NEW.total_cost / 100);
        
        UPDATE customers 
        SET loyalty_pts = loyalty_pts + v_points_earned,
            updated_at = CURRENT_TIMESTAMP
        WHERE cust_id = NEW.cust_id;
        
        -- 5. Log loyalty transaction
        INSERT INTO loyalty_transactions (cust_id, points, transaction_type, description)
        VALUES (NEW.cust_id, v_points_earned, 'EARNED', 
                'Points earned from booking #' || NEW.booking_id);
        
        -- 6. Update loyalty tier based on total points
        UPDATE customers
        SET loyalty_tier = CASE
            WHEN loyalty_pts >= 10000 THEN 'Platinum'
            WHEN loyalty_pts >= 5000 THEN 'Gold'
            WHEN loyalty_pts >= 2000 THEN 'Silver'
            ELSE 'Bronze'
        END
        WHERE cust_id = NEW.cust_id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_update_flight_after_booking ON bookings;
CREATE TRIGGER trg_update_flight_after_booking
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_flight_after_booking();

-- ============================================================================
-- 3. RESTORE SEATS ON BOOKING CANCELLATION
-- ============================================================================

CREATE OR REPLACE FUNCTION restore_seats_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    v_available_seats INT;
    v_total_seats INT;
    v_new_surge DECIMAL(4,2);
    v_base_price DECIMAL(10,2);
BEGIN
    -- Only process when status changes to CANCELLED or REFUNDED
    IF OLD.status IN ('CONFIRMED', 'PENDING') AND NEW.status IN ('CANCELLED', 'REFUNDED') THEN
        
        -- 1. Restore available seats
        UPDATE flights 
        SET available_seats = available_seats + OLD.seats_booked,
            updated_at = CURRENT_TIMESTAMP
        WHERE flight_id = OLD.flight_id
        RETURNING available_seats, total_seats INTO v_available_seats, v_total_seats;
        
        -- 2. Recalculate pricing
        v_new_surge := calculate_surge_multiplier(v_available_seats, v_total_seats);
        SELECT base_price INTO v_base_price FROM prices WHERE flight_id = OLD.flight_id;
        
        UPDATE prices 
        SET surge_multiplier = v_new_surge,
            current_price = v_base_price * v_new_surge,
            last_updated = CURRENT_TIMESTAMP
        WHERE flight_id = OLD.flight_id;
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_seats_on_cancellation ON bookings;
CREATE TRIGGER trg_restore_seats_on_cancellation
    AFTER UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION restore_seats_on_cancellation();

-- ============================================================================
-- 4. AUTO-UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to customers table
DROP TRIGGER IF EXISTS trg_customers_timestamp ON customers;
CREATE TRIGGER trg_customers_timestamp
    BEFORE UPDATE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Apply to flights table
DROP TRIGGER IF EXISTS trg_flights_timestamp ON flights;
CREATE TRIGGER trg_flights_timestamp
    BEFORE UPDATE ON flights
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Apply to bookings table
DROP TRIGGER IF EXISTS trg_bookings_timestamp ON bookings;
CREATE TRIGGER trg_bookings_timestamp
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 5. VALIDATE BOOKING BEFORE INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_available INT;
    v_flight_status VARCHAR(20);
BEGIN
    -- Check flight status
    SELECT available_seats, status INTO v_available, v_flight_status
    FROM flights WHERE flight_id = NEW.flight_id;
    
    IF v_flight_status IN ('CANCELLED', 'DEPARTED', 'ARRIVED') THEN
        RAISE EXCEPTION 'Cannot book on flight with status: %', v_flight_status;
    END IF;
    
    IF v_available < NEW.seats_booked THEN
        RAISE EXCEPTION 'Only % seats available, requested %', v_available, NEW.seats_booked;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_booking ON bookings;
CREATE TRIGGER trg_validate_booking
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking();

-- ============================================================================
-- 6. SYNC TO MONGODB NOTIFICATION (Application Layer Hook)
-- This trigger notifies the application to sync data to MongoDB
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_mongodb_sync()
RETURNS TRIGGER AS $$
DECLARE
    rec_id INT;
    payload JSON;
BEGIN
    -- Convert the record to JSON to access columns dynamically without errors
    payload := row_to_json(NEW);

    -- Extract ID based on table name safely
    IF TG_TABLE_NAME = 'bookings' THEN
        rec_id := (payload->>'booking_id')::INT;
    ELSIF TG_TABLE_NAME = 'prices' THEN
        rec_id := (payload->>'price_id')::INT;
    ELSIF TG_TABLE_NAME = 'reviews' THEN
        rec_id := (payload->>'review_id')::INT;
    END IF;

    PERFORM pg_notify('mongodb_sync', json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', rec_id,
        'timestamp', CURRENT_TIMESTAMP
    )::text);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to prices for price history sync
DROP TRIGGER IF EXISTS trg_sync_prices ON prices;
CREATE TRIGGER trg_sync_prices
    AFTER INSERT OR UPDATE ON prices
    FOR EACH ROW
    EXECUTE FUNCTION notify_mongodb_sync();

-- Apply to bookings for behavior logging
DROP TRIGGER IF EXISTS trg_sync_bookings ON bookings;
CREATE TRIGGER trg_sync_bookings
    AFTER INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION notify_mongodb_sync();
