"""
FlightSync - Service Layer
Business logic for flights, bookings, customers, and analytics
"""

from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import List, Optional, Dict, Any
import hashlib
import secrets

from config import get_pg_connection, get_mongo_connection
from models import (
    CustomerCreate, CustomerUpdate, Customer, CustomerDashboard,
    FlightSearchRequest, FlightSearch, BookingCreate, Booking,
    BookingDetail, PaymentCreate, Payment, ReviewCreate, Review,
    BookingStatus, PaymentStatus, BookingClass, LoyaltyTier
)
from pricing_engine import DynamicPricingEngine


# ============================================================================
# CUSTOMER SERVICE
# ============================================================================

class CustomerService:
    """Service for customer-related operations"""
    
    def __init__(self):
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
    
    def create_customer(self, data: CustomerCreate) -> Dict:
        """Register a new customer"""
        # Hash password
        pass_hash = hashlib.sha256(data.password.encode()).hexdigest()
        
        query = """
            INSERT INTO customers (fname, lname, email, phone, dob, pass_hash)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING cust_id, fname, lname, email, loyalty_tier, loyalty_pts, created_at
        """
        result = self.pg.execute_one(query, (
            data.fname, data.lname, data.email, 
            data.phone, data.dob, pass_hash
        ))
        return dict(result)
    
    def get_customer(self, cust_id: int) -> Optional[Dict]:
        """Get customer by ID"""
        query = """
            SELECT cust_id, fname, lname, email, phone, dob, 
                   balance, loyalty_pts, loyalty_tier, created_at, updated_at
            FROM customers WHERE cust_id = %s
        """
        result = self.pg.execute_one(query, (cust_id,))
        return dict(result) if result else None
    
    def get_customer_by_email(self, email: str) -> Optional[Dict]:
        """Get customer by email"""
        query = "SELECT * FROM customers WHERE email = %s"
        result = self.pg.execute_one(query, (email,))
        return dict(result) if result else None
    
    def authenticate(self, email: str, password: str) -> Optional[Dict]:
        """Authenticate customer login"""
        pass_hash = hashlib.sha256(password.encode()).hexdigest()
        query = """
            SELECT cust_id, fname, lname, email, loyalty_tier, loyalty_pts
            FROM customers WHERE email = %s AND pass_hash = %s
        """
        result = self.pg.execute_one(query, (email, pass_hash))
        return dict(result) if result else None
    
    def update_customer(self, cust_id: int, data: CustomerUpdate) -> Dict:
        """Update customer profile"""
        updates = []
        values = []
        
        if data.fname:
            updates.append("fname = %s")
            values.append(data.fname)
        if data.lname:
            updates.append("lname = %s")
            values.append(data.lname)
        if data.phone:
            updates.append("phone = %s")
            values.append(data.phone)
        if data.dob:
            updates.append("dob = %s")
            values.append(data.dob)
        
        if not updates:
            return self.get_customer(cust_id)
        
        values.append(cust_id)
        query = f"""
            UPDATE customers SET {', '.join(updates)}
            WHERE cust_id = %s
            RETURNING cust_id, fname, lname, email, phone, dob
        """
        result = self.pg.execute_one(query, tuple(values))
        return dict(result)
    
    def get_dashboard(self, cust_id: int) -> CustomerDashboard:
        """Get customer dashboard data"""
        query = "SELECT * FROM get_customer_dashboard(%s)"
        result = self.pg.execute_one(query, (cust_id,))
        return CustomerDashboard(**result)
    
    def get_booking_history(self, cust_id: int) -> List[Dict]:
        """Get customer's booking history"""
        query = """
            SELECT * FROM vw_customer_booking_history
            WHERE cust_id = %s
            ORDER BY booking_date DESC
        """
        results = self.pg.execute(query, (cust_id,))
        return [dict(r) for r in results]
    
    def get_loyalty_history(self, cust_id: int, limit: int = 20) -> List[Dict]:
        """Get loyalty points transaction history"""
        query = "SELECT * FROM get_loyalty_history(%s, %s)"
        results = self.pg.execute(query, (cust_id, limit))
        return [dict(r) for r in results]
    
    def redeem_points(self, cust_id: int, points: int, description: str) -> str:
        """Redeem loyalty points"""
        query = "SELECT redeem_points(%s, %s, %s)"
        result = self.pg.execute_one(query, (cust_id, points, description))
        return result['redeem_points']


# ============================================================================
# FLIGHT SERVICE
# ============================================================================

class FlightService:
    """Service for flight-related operations"""
    
    def __init__(self):
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
        self.pricing_engine = DynamicPricingEngine()
    
    def search_flights(self, request: FlightSearchRequest) -> List[FlightSearch]:
        """Search for available flights"""
        query = "SELECT * FROM search_flights(%s, %s, %s, %s)"
        results = self.pg.execute(query, (
            request.origin,
            request.destination,
            request.travel_date,
            request.passengers
        ))
        
        flights = []
        for r in results:
            flights.append(FlightSearch(
                flight_id=r['flight_id'],
                flight_code=r['flight_code'],
                origin=r['origin'],
                destination=r['destination'],
                departure=r['departure'],
                arrival=r['arrival'],
                duration_hours=float(r['duration_hours']),
                available_seats=r['available_seats'],
                current_price=r['current_price'],
                price_tier=r['price_tier'],
                aircraft_model=r['aircraft_model']
            ))
        
        # Log search to MongoDB for behavior analytics
        self._log_search(request)
        
        return flights
    
    def get_flight_details(self, flight_id: int) -> Optional[Dict]:
        """Get detailed flight information"""
        query = """
            SELECT * FROM vw_flight_search
            WHERE flight_id = %s
        """
        result = self.pg.execute_one(query, (flight_id,))
        
        if result:
            # Get reviews summary
            reviews = self.pg.execute_one("""
                SELECT * FROM vw_flight_reviews_summary
                WHERE flight_id = %s
            """, (flight_id,))
            
            flight_dict = dict(result)
            if reviews:
                flight_dict['reviews'] = dict(reviews)
            
            return flight_dict
        return None
    
    def get_route_pricing(self, origin: str, destination: str) -> List[Dict]:
        """Get pricing for a specific route"""
        query = "SELECT * FROM get_route_pricing(%s, %s)"
        results = self.pg.execute(query, (origin, destination))
        return [dict(r) for r in results]
    
    def get_price_history(self, flight_id: int, days: int = 7) -> List[Dict]:
        """Get price history from MongoDB"""
        try:
            cutoff = datetime.now() - timedelta(days=days)
            pipeline = [
                {"$match": {"flight_id": flight_id}},
                {"$unwind": "$price_snapshots"},
                {"$match": {"price_snapshots.timestamp": {"$gte": cutoff}}},
                {"$sort": {"price_snapshots.timestamp": -1}},
                {"$project": {
                    "_id": 0,
                    "timestamp": "$price_snapshots.timestamp",
                    "current_price": "$price_snapshots.current_price",
                    "surge_multiplier": "$price_snapshots.surge_multiplier",
                    "occupancy_rate": "$price_snapshots.occupancy_rate"
                }}
            ]
            results = list(self.mongo.price_history.aggregate(pipeline))
            return results
        except Exception:
            return []
    
    def refresh_price(self, flight_id: int) -> Dict:
        """Manually refresh price for a flight"""
        return self.pricing_engine.update_flight_price(flight_id)
    
    def _log_search(self, request: FlightSearchRequest):
        """Log search to MongoDB for analytics"""
        try:
            search_log = {
                'origin': request.origin,
                'destination': request.destination,
                'travel_date': datetime.combine(request.travel_date, datetime.min.time()),
                'passengers': request.passengers,
                'searched_at': datetime.now()
            }
            # This would be associated with a session/customer in real implementation
        except Exception:
            pass
    
    def get_all_flights(self) -> List[Dict]:
        """Get all flights for admin management"""
        query = """
            SELECT 
                f.flight_id, f.flight_code, f.origin, f.destination,
                f.dep_time, f.arr_time, f.status, f.available_seats, f.total_seats,
                a.model as aircraft_model, a.aircraft_no,
                p.base_price, p.current_price, p.surge_multiplier
            FROM flights f
            LEFT JOIN aircraft a ON f.aircraft_no = a.aircraft_no
            LEFT JOIN prices p ON f.flight_id = p.flight_id
            ORDER BY f.dep_time DESC
        """
        results = self.pg.execute(query)
        return [dict(r) for r in results]
    
    def add_flight(self, flight_code: str, origin: str, destination: str,
                   dep_time: str, arr_time: str, aircraft_no: str = None,
                   base_price: float = 5000, total_seats: int = 180) -> Dict:
        """Add a new flight (Admin only)"""
        
        # Parse datetime strings
        dep_datetime = datetime.fromisoformat(dep_time.replace('T', ' '))
        arr_datetime = datetime.fromisoformat(arr_time.replace('T', ' '))
        
        # Check for duplicate flight code
        existing = self.pg.execute_one(
            "SELECT flight_id FROM flights WHERE flight_code = %s AND dep_time::date = %s",
            (flight_code, dep_datetime.date())
        )
        if existing:
            raise ValueError(f"Flight {flight_code} already exists for this date")
        
        # Insert flight
        flight_query = """
            INSERT INTO flights (flight_code, origin, destination, dep_time, arr_time, 
                                aircraft_no, status, available_seats, total_seats)
            VALUES (%s, %s, %s, %s, %s, %s, 'SCHEDULED', %s, %s)
            RETURNING flight_id
        """
        result = self.pg.execute_one(flight_query, (
            flight_code, origin, destination, dep_datetime, arr_datetime,
            aircraft_no, total_seats, total_seats
        ))
        
        flight_id = result['flight_id']
        
        # Create price entry
        price_query = """
            INSERT INTO prices (flight_id, base_price, current_price, surge_multiplier, last_updated)
            VALUES (%s, %s, %s, 1.0, NOW())
        """
        self.pg.execute(price_query, (flight_id, base_price, base_price))
        
        return {
            'flight_id': flight_id,
            'flight_code': flight_code,
            'message': f'Flight {flight_code} added successfully'
        }
    
    def cancel_flight(self, flight_id: int, reason: str) -> Dict:
        """Cancel a flight and process refunds for all bookings"""
        
        # Get flight info
        flight = self.pg.execute_one(
            "SELECT * FROM flights WHERE flight_id = %s", (flight_id,)
        )
        if not flight:
            raise ValueError("Flight not found")
        
        if flight['status'] == 'CANCELLED':
            raise ValueError("Flight is already cancelled")
        
        if flight['status'] == 'ARRIVED':
            raise ValueError("Cannot cancel a completed flight")
        
        # Update flight status
        self.pg.execute(
            "UPDATE flights SET status = 'CANCELLED' WHERE flight_id = %s",
            (flight_id,)
        )
        
        # Get all active bookings for this flight
        bookings_query = """
            SELECT b.booking_id, b.cust_id, b.total_cost, b.booking_status
            FROM bookings b
            JOIN booking_flights bf ON b.booking_id = bf.booking_id
            WHERE bf.flight_id = %s AND b.booking_status IN ('CONFIRMED', 'PENDING')
        """
        bookings = self.pg.execute(bookings_query, (flight_id,))
        
        refunded_count = 0
        total_refunded = 0
        
        for booking in bookings:
            # Update booking status
            self.pg.execute(
                "UPDATE bookings SET booking_status = 'REFUNDED' WHERE booking_id = %s",
                (booking['booking_id'],)
            )
            
            # Refund to customer balance
            self.pg.execute(
                "UPDATE customers SET balance = balance + %s WHERE cust_id = %s",
                (booking['total_cost'], booking['cust_id'])
            )
            
            # Update payment status
            self.pg.execute("""
                UPDATE payments SET payment_status = 'REFUNDED' 
                WHERE booking_id = %s AND payment_status = 'SUCCESS'
            """, (booking['booking_id'],))
            
            refunded_count += 1
            total_refunded += float(booking['total_cost'])
        
        return {
            'flight_id': flight_id,
            'flight_code': flight['flight_code'],
            'status': 'CANCELLED',
            'reason': reason,
            'bookings_refunded': refunded_count,
            'total_amount_refunded': total_refunded,
            'message': f'Flight {flight["flight_code"]} cancelled. {refunded_count} bookings refunded.'
        }
    
    def update_flight(self, flight_id: int, data: Dict) -> Dict:
        """Update flight details"""
        allowed_fields = ['origin', 'destination', 'dep_time', 'arr_time', 'status', 'aircraft_no']
        updates = []
        values = []
        
        for field in allowed_fields:
            if field in data:
                updates.append(f"{field} = %s")
                values.append(data[field])
        
        if not updates:
            raise ValueError("No valid fields to update")
        
        values.append(flight_id)
        query = f"UPDATE flights SET {', '.join(updates)} WHERE flight_id = %s RETURNING *"
        result = self.pg.execute_one(query, values)
        
        return dict(result) if result else {'error': 'Flight not found'}


# ============================================================================
# BOOKING SERVICE
# ============================================================================

class BookingService:
    """Service for booking-related operations"""
    
    CLASS_MULTIPLIERS = {
        BookingClass.ECONOMY: Decimal("1.0"),
        BookingClass.PREMIUM_ECONOMY: Decimal("1.5"),
        BookingClass.BUSINESS: Decimal("2.5"),
        BookingClass.FIRST: Decimal("4.0"),
    }
    
    def __init__(self):
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
    
    def create_booking(self, cust_id: int, data: BookingCreate) -> Dict:
        """Create a new booking"""
        # Get current price
        price_query = """
            SELECT current_price FROM prices WHERE flight_id = %s
        """
        price_result = self.pg.execute_one(price_query, (data.flight_id,))
        
        if not price_result:
            raise ValueError("Flight not found")
        
        current_price = price_result['current_price']
        class_multiplier = self.CLASS_MULTIPLIERS.get(data.booking_class, Decimal("1.0"))
        total_cost = current_price * data.seats_booked * class_multiplier
        
        # Create booking (triggers handle seat updates, pricing, loyalty)
        query = """
            INSERT INTO bookings (cust_id, flight_id, seats_booked, total_cost, 
                                  booking_class, special_requests, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'CONFIRMED')
            RETURNING booking_id, cust_id, flight_id, seats_booked, total_cost,
                      booking_date, status, booking_class
        """
        result = self.pg.execute_one(query, (
            cust_id, data.flight_id, data.seats_booked, 
            total_cost, data.booking_class.value, data.special_requests
        ))
        
        booking = dict(result)
        
        # Log to MongoDB for behavior tracking
        self._log_booking(cust_id, booking)
        
        return booking
    
    def get_booking(self, booking_id: int) -> Optional[Dict]:
        """Get booking details"""
        query = """
            SELECT b.*, f.flight_code, f.origin, f.destination,
                   f.dep_time, f.arr_time, p.status as payment_status
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE b.booking_id = %s
        """
        result = self.pg.execute_one(query, (booking_id,))
        return dict(result) if result else None
    
    def get_upcoming_bookings(self, cust_id: int) -> List[Dict]:
        """Get upcoming bookings for a customer"""
        query = "SELECT * FROM get_upcoming_bookings(%s)"
        results = self.pg.execute(query, (cust_id,))
        return [dict(r) for r in results]
    
    def cancel_booking(self, booking_id: int, reason: str = None) -> str:
        """Cancel a booking"""
        reason = reason or "Customer requested cancellation"
        query = "SELECT cancel_booking(%s, %s)"
        result = self.pg.execute_one(query, (booking_id, reason))
        return result['cancel_booking']
    
    def _log_booking(self, cust_id: int, booking: Dict):
        """Log booking to MongoDB"""
        try:
            activity = {
                'action': 'completed_booking',
                'timestamp': datetime.now(),
                'details': {
                    'booking_id': booking['booking_id'],
                    'flight_id': booking['flight_id'],
                    'seats_booked': booking['seats_booked'],
                    'total_cost': float(booking['total_cost'])
                }
            }
            # Would be associated with customer session
        except Exception:
            pass


# ============================================================================
# PAYMENT SERVICE
# ============================================================================

class PaymentService:
    """Service for payment processing"""
    
    def __init__(self):
        self.pg = get_pg_connection()
    
    def process_payment(self, cust_id: int, data: PaymentCreate) -> Dict:
        """Process a payment for a booking"""
        # Generate transaction ID
        transaction_id = f"TXN_{secrets.token_hex(8).upper()}"
        
        # Insert payment record
        query = """
            INSERT INTO payments (booking_id, cust_id, amount, payment_method, 
                                  transaction_id, status)
            VALUES (%s, %s, %s, %s, %s, 'SUCCESS')
            RETURNING payment_id, booking_id, amount, payment_method, 
                      transaction_id, status, payment_date
        """
        result = self.pg.execute_one(query, (
            data.booking_id, cust_id, data.amount,
            data.payment_method.value, transaction_id
        ))
        
        return dict(result)
    
    def get_payment(self, payment_id: int) -> Optional[Dict]:
        """Get payment details"""
        query = "SELECT * FROM payments WHERE payment_id = %s"
        result = self.pg.execute_one(query, (payment_id,))
        return dict(result) if result else None
    
    def refund_payment(self, payment_id: int) -> str:
        """Process a refund"""
        query = """
            UPDATE payments SET status = 'REFUNDED'
            WHERE payment_id = %s AND status = 'SUCCESS'
            RETURNING payment_id
        """
        result = self.pg.execute_one(query, (payment_id,))
        
        if result:
            return "Refund processed successfully"
        return "Payment not found or already refunded"


# ============================================================================
# REVIEW SERVICE
# ============================================================================

class ReviewService:
    """Service for review management"""
    
    def __init__(self):
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
    
    def submit_review(self, cust_id: int, data: ReviewCreate) -> str:
        """Submit a flight review"""
        query = """
            SELECT submit_review(%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        result = self.pg.execute_one(query, (
            data.flight_id, cust_id, data.booking_id, data.rating,
            data.title, data.comment, data.meal_rating,
            data.service_rating, data.comfort_rating
        ))
        
        # Also store in MongoDB with extended schema
        self._store_mongo_review(cust_id, data)
        
        return result['submit_review']
    
    def get_flight_reviews(self, flight_id: int) -> List[Dict]:
        """Get reviews for a flight"""
        query = "SELECT * FROM get_flight_reviews(%s)"
        results = self.pg.execute(query, (flight_id,))
        return [dict(r) for r in results]
    
    def get_reviews_summary(self, flight_id: int) -> Dict:
        """Get review summary for a flight"""
        query = "SELECT * FROM vw_flight_reviews_summary WHERE flight_id = %s"
        result = self.pg.execute_one(query, (flight_id,))
        return dict(result) if result else None
    
    def mark_helpful(self, review_id: int) -> bool:
        """Mark a review as helpful"""
        query = """
            UPDATE reviews SET helpful_count = helpful_count + 1
            WHERE review_id = %s
            RETURNING review_id
        """
        result = self.pg.execute_one(query, (review_id,))
        return result is not None
    
    def _store_mongo_review(self, cust_id: int, data: ReviewCreate):
        """Store extended review in MongoDB"""
        try:
            review_doc = {
                'flight_id': data.flight_id,
                'customer_id': cust_id,
                'booking_id': data.booking_id,
                'rating': data.rating,
                'review': {
                    'title': data.title,
                    'comment': data.comment
                },
                'category_ratings': {
                    'meal': data.meal_rating,
                    'service': data.service_rating,
                    'comfort': data.comfort_rating
                },
                'helpful_votes': 0,
                'status': 'published',
                'created_at': datetime.now()
            }
            self.mongo.flight_reviews.insert_one(review_doc)
        except Exception:
            pass


# ============================================================================
# ANALYTICS SERVICE
# ============================================================================

class AnalyticsService:
    """Service for analytics and reporting"""
    
    def __init__(self):
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
    
    def get_revenue_report(self, start_date: date, end_date: date) -> List[Dict]:
        """Get revenue report for date range"""
        query = "SELECT * FROM get_revenue_report(%s, %s)"
        results = self.pg.execute(query, (start_date, end_date))
        return [dict(r) for r in results]
    
    def get_top_routes(self, limit: int = 10) -> List[Dict]:
        """Get top routes by revenue"""
        query = "SELECT * FROM get_top_routes(%s)"
        results = self.pg.execute(query, (limit,))
        return [dict(r) for r in results]
    
    def get_route_performance(self) -> List[Dict]:
        """Get route performance metrics"""
        query = "SELECT * FROM vw_route_performance"
        results = self.pg.execute(query)
        return [dict(r) for r in results]
    
    def get_loyalty_analytics(self) -> List[Dict]:
        """Get loyalty program analytics"""
        query = "SELECT * FROM vw_loyalty_analytics ORDER BY lifetime_value DESC LIMIT 100"
        results = self.pg.execute(query)
        return [dict(r) for r in results]
    
    def get_payment_summary(self, days: int = 30) -> List[Dict]:
        """Get payment summary"""
        query = """
            SELECT * FROM vw_payment_summary
            WHERE payment_day >= CURRENT_DATE - %s
        """
        results = self.pg.execute(query, (days,))
        return [dict(r) for r in results]
    
    def get_abandoned_carts(self, hours: int = 24) -> List[Dict]:
        """Get abandoned carts from MongoDB"""
        try:
            cutoff = datetime.now() - timedelta(hours=hours)
            pipeline = [
                {"$match": {"abandoned_carts": {"$exists": True, "$ne": []}}},
                {"$unwind": "$abandoned_carts"},
                {"$match": {"abandoned_carts.abandoned_at": {"$gte": cutoff}}},
                {"$project": {
                    "_id": 0,
                    "customer_id": 1,
                    "flight_id": "$abandoned_carts.flight_id",
                    "price_at_abandonment": "$abandoned_carts.price_at_abandonment",
                    "abandoned_at": "$abandoned_carts.abandoned_at"
                }}
            ]
            results = list(self.mongo.customer_behavior.aggregate(pipeline))
            return results
        except Exception:
            return []
    
    def get_price_trends(self, route: str = None, days: int = 30) -> List[Dict]:
        """Get price trends from MongoDB"""
        try:
            cutoff = datetime.now() - timedelta(days=days)
            match_stage = {"price_snapshots.timestamp": {"$gte": cutoff}}
            
            if route:
                origin, dest = route.split('-')
                match_stage["route.origin"] = {"$regex": origin, "$options": "i"}
                match_stage["route.destination"] = {"$regex": dest, "$options": "i"}
            
            pipeline = [
                {"$unwind": "$price_snapshots"},
                {"$match": match_stage},
                {"$group": {
                    "_id": {
                        "flight_code": "$flight_code",
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$price_snapshots.timestamp"}}
                    },
                    "avg_price": {"$avg": "$price_snapshots.current_price"},
                    "avg_occupancy": {"$avg": "$price_snapshots.occupancy_rate"}
                }},
                {"$sort": {"_id.date": 1}}
            ]
            results = list(self.mongo.price_history.aggregate(pipeline))
            return results
        except Exception:
            return []
