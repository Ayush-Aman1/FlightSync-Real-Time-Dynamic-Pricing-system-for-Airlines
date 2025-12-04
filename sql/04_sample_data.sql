-- ============================================================================
-- FlightSync - Sample Data for Testing
-- ============================================================================

-- ============================================================================
-- 1. SAMPLE AIRCRAFT DATA
-- ============================================================================

INSERT INTO aircraft (aircraft_no, model, manufacturer, capacity, status) VALUES
('VT-ANA', 'A320neo', 'Airbus', 180, 'ACTIVE'),
('VT-ANB', 'Boeing 737-800', 'Boeing', 189, 'ACTIVE'),
('VT-ANC', 'A321neo', 'Airbus', 220, 'ACTIVE'),
('VT-AND', 'Boeing 787-8', 'Boeing', 256, 'ACTIVE'),
('VT-ANE', 'A350-900', 'Airbus', 300, 'ACTIVE'),
('VT-ANF', 'Boeing 777-300ER', 'Boeing', 350, 'MAINTENANCE');

-- ============================================================================
-- 2. SAMPLE CUSTOMERS DATA
-- ============================================================================

INSERT INTO customers (fname, lname, email, phone, dob, pass_hash, balance, loyalty_pts, loyalty_tier) VALUES
('Rahul', 'Sharma', 'rahul.sharma@email.com', '9876543210', '1990-05-15', 'hashed_password_1', 5000.00, 2500, 'Silver'),
('Priya', 'Patel', 'priya.patel@email.com', '9876543211', '1988-08-22', 'hashed_password_2', 10000.00, 5500, 'Gold'),
('Amit', 'Kumar', 'amit.kumar@email.com', '9876543212', '1995-03-10', 'hashed_password_3', 2500.00, 800, 'Bronze'),
('Sneha', 'Reddy', 'sneha.reddy@email.com', '9876543213', '1992-11-28', 'hashed_password_4', 15000.00, 12000, 'Platinum'),
('Vikram', 'Singh', 'vikram.singh@email.com', '9876543214', '1985-07-04', 'hashed_password_5', 3000.00, 3200, 'Silver'),
('Anjali', 'Gupta', 'anjali.gupta@email.com', '9876543215', '1993-09-18', 'hashed_password_6', 8000.00, 1500, 'Bronze'),
('Arjun', 'Nair', 'arjun.nair@email.com', '9876543216', '1991-12-01', 'hashed_password_7', 12000.00, 6800, 'Gold'),
('Kavitha', 'Menon', 'kavitha.menon@email.com', '9876543217', '1987-04-25', 'hashed_password_8', 4500.00, 950, 'Bronze'),
('Rajesh', 'Iyer', 'rajesh.iyer@email.com', '9876543218', '1982-06-30', 'hashed_password_9', 20000.00, 15000, 'Platinum'),
('Deepika', 'Verma', 'deepika.verma@email.com', '9876543219', '1994-02-14', 'hashed_password_10', 6000.00, 2100, 'Silver');

-- ============================================================================
-- 3. SAMPLE FLIGHTS DATA
-- ============================================================================

INSERT INTO flights (flight_code, aircraft_id, origin, destination, dep_time, arr_time, total_seats, available_seats, status) VALUES
-- Domestic Routes
('FS101', 1, 'Bengaluru (BLR)', 'Mumbai (BOM)', '2025-01-15 06:00:00', '2025-01-15 07:45:00', 180, 150, 'SCHEDULED'),
('FS102', 2, 'Mumbai (BOM)', 'Delhi (DEL)', '2025-01-15 08:30:00', '2025-01-15 10:30:00', 189, 120, 'SCHEDULED'),
('FS103', 1, 'Delhi (DEL)', 'Bengaluru (BLR)', '2025-01-15 11:00:00', '2025-01-15 13:45:00', 180, 90, 'SCHEDULED'),
('FS104', 3, 'Chennai (MAA)', 'Kolkata (CCU)', '2025-01-15 14:00:00', '2025-01-15 16:30:00', 220, 200, 'SCHEDULED'),
('FS105', 2, 'Hyderabad (HYD)', 'Mumbai (BOM)', '2025-01-15 17:00:00', '2025-01-15 18:30:00', 189, 50, 'SCHEDULED'),
('FS106', 1, 'Bengaluru (BLR)', 'Delhi (DEL)', '2025-01-16 06:00:00', '2025-01-16 08:45:00', 180, 180, 'SCHEDULED'),
('FS107', 3, 'Mumbai (BOM)', 'Chennai (MAA)', '2025-01-16 09:00:00', '2025-01-16 11:00:00', 220, 160, 'SCHEDULED'),
('FS108', 2, 'Delhi (DEL)', 'Hyderabad (HYD)', '2025-01-16 12:00:00', '2025-01-16 14:15:00', 189, 100, 'SCHEDULED'),
-- International Routes
('FS201', 4, 'Mumbai (BOM)', 'Dubai (DXB)', '2025-01-15 23:00:00', '2025-01-16 01:30:00', 256, 180, 'SCHEDULED'),
('FS202', 5, 'Delhi (DEL)', 'Singapore (SIN)', '2025-01-16 01:00:00', '2025-01-16 09:00:00', 300, 220, 'SCHEDULED'),
('FS203', 4, 'Bengaluru (BLR)', 'London (LHR)', '2025-01-16 22:00:00', '2025-01-17 05:30:00', 256, 200, 'SCHEDULED'),
('FS204', 5, 'Mumbai (BOM)', 'New York (JFK)', '2025-01-17 00:30:00', '2025-01-17 07:00:00', 300, 250, 'SCHEDULED');

-- ============================================================================
-- 4. SAMPLE PRICES DATA
-- ============================================================================

INSERT INTO prices (flight_id, base_price, current_price, surge_multiplier, min_price, max_price) VALUES
(1, 4500.00, 4500.00, 1.00, 3500.00, 12000.00),
(2, 5500.00, 6875.00, 1.25, 4000.00, 15000.00),
(3, 6000.00, 9000.00, 1.50, 4500.00, 18000.00),
(4, 5000.00, 4250.00, 0.85, 3800.00, 14000.00),
(5, 4000.00, 8000.00, 2.00, 3000.00, 12000.00),
(6, 6500.00, 5525.00, 0.85, 5000.00, 18000.00),
(7, 4800.00, 4800.00, 1.00, 3600.00, 13000.00),
(8, 5200.00, 6500.00, 1.25, 4000.00, 15000.00),
(9, 15000.00, 18750.00, 1.25, 12000.00, 45000.00),
(10, 25000.00, 25000.00, 1.00, 20000.00, 75000.00),
(11, 45000.00, 45000.00, 1.00, 35000.00, 120000.00),
(12, 65000.00, 65000.00, 1.00, 50000.00, 180000.00);

-- ============================================================================
-- 5. SAMPLE BOOKINGS DATA
-- ============================================================================

INSERT INTO bookings (cust_id, flight_id, seats_booked, total_cost, booking_date, status, booking_class) VALUES
(1, 1, 2, 9000.00, '2025-01-10 10:30:00', 'CONFIRMED', 'ECONOMY'),
(2, 2, 1, 6875.00, '2025-01-10 11:45:00', 'CONFIRMED', 'ECONOMY'),
(3, 3, 3, 27000.00, '2025-01-10 14:20:00', 'CONFIRMED', 'ECONOMY'),
(4, 5, 1, 8000.00, '2025-01-11 09:15:00', 'CONFIRMED', 'BUSINESS'),
(5, 9, 2, 37500.00, '2025-01-11 16:30:00', 'CONFIRMED', 'ECONOMY'),
(6, 1, 1, 4500.00, '2025-01-12 08:00:00', 'CONFIRMED', 'ECONOMY'),
(7, 10, 1, 25000.00, '2025-01-12 12:45:00', 'CONFIRMED', 'ECONOMY'),
(8, 3, 2, 18000.00, '2025-01-12 17:30:00', 'CANCELLED', 'ECONOMY'),
(9, 11, 2, 90000.00, '2025-01-13 10:00:00', 'CONFIRMED', 'BUSINESS'),
(10, 2, 1, 6875.00, '2025-01-13 14:15:00', 'CONFIRMED', 'ECONOMY');

-- ============================================================================
-- 6. SAMPLE PAYMENTS DATA
-- ============================================================================

INSERT INTO payments (booking_id, cust_id, amount, payment_method, transaction_id, status) VALUES
(1, 1, 9000.00, 'CREDIT_CARD', 'TXN_001_CC_2025', 'SUCCESS'),
(2, 2, 6875.00, 'UPI', 'TXN_002_UPI_2025', 'SUCCESS'),
(3, 3, 27000.00, 'NET_BANKING', 'TXN_003_NB_2025', 'SUCCESS'),
(4, 4, 8000.00, 'CREDIT_CARD', 'TXN_004_CC_2025', 'SUCCESS'),
(5, 5, 37500.00, 'DEBIT_CARD', 'TXN_005_DC_2025', 'SUCCESS'),
(6, 6, 4500.00, 'UPI', 'TXN_006_UPI_2025', 'SUCCESS'),
(7, 7, 25000.00, 'CREDIT_CARD', 'TXN_007_CC_2025', 'SUCCESS'),
(8, 8, 18000.00, 'NET_BANKING', 'TXN_008_NB_2025', 'REFUNDED'),
(9, 9, 90000.00, 'CREDIT_CARD', 'TXN_009_CC_2025', 'SUCCESS'),
(10, 10, 6875.00, 'WALLET', 'TXN_010_WL_2025', 'SUCCESS');

-- ============================================================================
-- 7. SAMPLE REVIEWS DATA
-- ============================================================================

INSERT INTO reviews (flight_id, cust_id, booking_id, rating, title, comment, meal_rating, service_rating, comfort_rating, helpful_count) VALUES
(1, 1, 1, 4, 'Good flight experience', 'Smooth flight, on-time departure. Crew was helpful.', 4, 5, 4, 12),
(2, 2, 2, 5, 'Excellent service!', 'Best airline experience. Will definitely fly again.', 5, 5, 5, 28),
(3, 3, 3, 3, 'Average experience', 'Flight was delayed by 30 mins. Food was okay.', 3, 3, 4, 5),
(5, 4, 4, 5, 'Premium experience', 'Business class was worth every penny. Great service!', 5, 5, 5, 45),
(9, 5, 5, 4, 'Nice international flight', 'Good entertainment options. Food could be better.', 3, 4, 5, 18);

-- ============================================================================
-- 8. SAMPLE LOYALTY TRANSACTIONS
-- ============================================================================

INSERT INTO loyalty_transactions (cust_id, points, transaction_type, description, status) VALUES
(1, 90, 'EARNED', 'Points earned from booking #1', 'COMPLETED'),
(2, 68, 'EARNED', 'Points earned from booking #2', 'COMPLETED'),
(3, 270, 'EARNED', 'Points earned from booking #3', 'COMPLETED'),
(4, 80, 'EARNED', 'Points earned from booking #4', 'COMPLETED'),
(5, 375, 'EARNED', 'Points earned from booking #5', 'COMPLETED'),
(6, 45, 'EARNED', 'Points earned from booking #6', 'COMPLETED'),
(7, 250, 'EARNED', 'Points earned from booking #7', 'COMPLETED'),
(9, 900, 'EARNED', 'Points earned from booking #9', 'COMPLETED'),
(10, 68, 'EARNED', 'Points earned from booking #10', 'COMPLETED'),
(1, 500, 'BONUS', 'Welcome bonus', 'COMPLETED'),
(4, 1000, 'REDEEMED', 'Redeemed for upgrade', 'COMPLETED'),
(2, 200, 'BONUS', 'Birthday bonus', 'COMPLETED');
