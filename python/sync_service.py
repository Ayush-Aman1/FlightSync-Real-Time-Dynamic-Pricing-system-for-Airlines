"""
FlightSync - MongoDB Sync Service
Listens to PostgreSQL notifications and syncs data to MongoDB
"""

import json
import select
import psycopg2
import psycopg2.extensions
from datetime import datetime
from typing import Dict, Any

from config import get_pg_connection, get_mongo_connection, PostgreSQLConfig


class MongoDBSyncService:
    """
    Service that listens to PostgreSQL NOTIFY events and syncs
    relevant data to MongoDB collections.
    """
    
    def __init__(self):
        self.pg_config = PostgreSQLConfig()
        self.mongo = get_mongo_connection()
        self.conn = None
        self.running = False
    
    def connect(self):
        """Establish connection to PostgreSQL for listening"""
        self.conn = psycopg2.connect(**self.pg_config.connection_dict)
        self.conn.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
        
        cursor = self.conn.cursor()
        cursor.execute("LISTEN mongodb_sync;")
        print("[Sync Service] Listening for PostgreSQL notifications...")
    
    def process_notification(self, payload: str):
        """Process a notification from PostgreSQL"""
        try:
            data = json.loads(payload)
            table = data.get('table')
            operation = data.get('operation')
            record_id = data.get('record_id')
            
            print(f"[Sync Service] Received: {operation} on {table} (ID: {record_id})")
            
            if table == 'prices':
                self.sync_price_history(record_id)
            elif table == 'bookings':
                self.sync_booking_behavior(record_id)
            elif table == 'reviews':
                self.sync_review(record_id)
                
        except json.JSONDecodeError as e:
            print(f"[Sync Service] Invalid JSON payload: {e}")
        except Exception as e:
            print(f"[Sync Service] Error processing notification: {e}")
    
    def sync_price_history(self, price_id: int):
        """Sync price update to MongoDB price_history collection"""
        pg = get_pg_connection()
        
        query = """
            SELECT p.*, f.flight_code, f.origin, f.destination, 
                   f.available_seats, f.total_seats
            FROM prices p
            JOIN flights f ON p.flight_id = f.flight_id
            WHERE p.price_id = %s
        """
        price_data = pg.execute_one(query, (price_id,))
        
        if not price_data:
            return
        
        occupancy = 0
        if price_data['total_seats'] > 0:
            occupancy = round(
                (1 - price_data['available_seats'] / price_data['total_seats']) * 100, 2
            )
        
        snapshot = {
            'timestamp': datetime.now(),
            'base_price': float(price_data['base_price']),
            'current_price': float(price_data['current_price']),
            'surge_multiplier': float(price_data['surge_multiplier']),
            'available_seats': price_data['available_seats'],
            'total_seats': price_data['total_seats'],
            'occupancy_rate': occupancy,
            'triggered_by': 'database_trigger'
        }
        
        self.mongo.price_history.update_one(
            {'flight_id': price_data['flight_id']},
            {
                '$push': {'price_snapshots': snapshot},
                '$set': {'updated_at': datetime.now()},
                '$setOnInsert': {
                    'flight_code': price_data['flight_code'],
                    'route': {
                        'origin': price_data['origin'],
                        'destination': price_data['destination']
                    },
                    'created_at': datetime.now()
                }
            },
            upsert=True
        )
        
        print(f"[Sync Service] Price history synced for flight {price_data['flight_code']}")
    
    def sync_booking_behavior(self, booking_id: int):
        """Sync booking to customer behavior logs in MongoDB"""
        pg = get_pg_connection()
        
        query = """
            SELECT b.*, f.flight_code, f.origin, f.destination, c.email
            FROM bookings b
            JOIN flights f ON b.flight_id = f.flight_id
            JOIN customers c ON b.cust_id = c.cust_id
            WHERE b.booking_id = %s
        """
        booking = pg.execute_one(query, (booking_id,))
        
        if not booking:
            return
        
        activity = {
            'action': 'completed_booking',
            'timestamp': datetime.now(),
            'details': {
                'booking_id': booking['booking_id'],
                'flight_id': booking['flight_id'],
                'flight_code': booking['flight_code'],
                'origin': booking['origin'],
                'destination': booking['destination'],
                'seats_booked': booking['seats_booked'],
                'total_cost': float(booking['total_cost']),
                'booking_class': booking['booking_class']
            }
        }
        
        session_id = f"sys_{booking['cust_id']}_{datetime.now().strftime('%Y%m%d')}"
        
        self.mongo.customer_behavior.update_one(
            {'customer_id': booking['cust_id'], 'session_id': session_id},
            {
                '$push': {'activities': activity},
                '$set': {'is_active': True, 'session_end': datetime.now()},
                '$setOnInsert': {
                    'session_start': datetime.now(),
                    'search_history': [],
                    'abandoned_carts': []
                }
            },
            upsert=True
        )
        
        self.mongo.customer_behavior.update_many(
            {'customer_id': booking['cust_id']},
            {'$pull': {'abandoned_carts': {'flight_id': booking['flight_id']}}}
        )
        
        print(f"[Sync Service] Booking behavior synced for customer {booking['cust_id']}")
    
    def sync_review(self, review_id: int):
        """Sync review to MongoDB flight_reviews collection"""
        pg = get_pg_connection()
        
        query = """
            SELECT r.*, f.flight_code, f.origin, f.destination, c.fname, c.lname
            FROM reviews r
            JOIN flights f ON r.flight_id = f.flight_id
            JOIN customers c ON r.cust_id = c.cust_id
            WHERE r.review_id = %s
        """
        review = pg.execute_one(query, (review_id,))
        
        if not review:
            return
        
        review_doc = {
            'flight_id': review['flight_id'],
            'customer_id': review['cust_id'],
            'booking_id': review['booking_id'],
            'rating': review['rating'],
            'review': {'title': review['title'], 'comment': review['comment']},
            'category_ratings': {
                'meal': review['meal_rating'],
                'service': review['service_rating'],
                'comfort': review['comfort_rating']
            },
            'flight_details': {
                'flight_code': review['flight_code'],
                'route': f"{review['origin']} → {review['destination']}"
            },
            'helpful_votes': review['helpful_count'],
            'status': review['status'].lower(),
            'created_at': review['review_date'],
            'updated_at': datetime.now()
        }
        
        self.mongo.flight_reviews.update_one(
            {'customer_id': review['cust_id'], 'booking_id': review['booking_id']},
            {'$set': review_doc},
            upsert=True
        )
        
        print(f"[Sync Service] Review synced for flight {review['flight_code']}")
    
    def run(self):
        """Main run loop - listen for notifications"""
        self.connect()
        self.running = True
        
        print("[Sync Service] Starting sync service...")
        
        while self.running:
            if select.select([self.conn], [], [], 5) == ([], [], []):
                continue
            
            self.conn.poll()
            while self.conn.notifies:
                notify = self.conn.notifies.pop(0)
                self.process_notification(notify.payload)
    
    def stop(self):
        """Stop the sync service"""
        self.running = False
        if self.conn:
            self.conn.close()
        print("[Sync Service] Stopped")


class BulkSyncService:
    """Service for bulk syncing data between PostgreSQL and MongoDB."""
    
    def __init__(self):
        self.pg = get_pg_connection()
        self.mongo = get_mongo_connection()
    
    def sync_all_prices(self):
        """Sync all price data to MongoDB"""
        print("[Bulk Sync] Syncing all prices...")
        
        query = """
            SELECT p.*, f.flight_code, f.origin, f.destination,
                   f.available_seats, f.total_seats
            FROM prices p
            JOIN flights f ON p.flight_id = f.flight_id
        """
        prices = self.pg.execute(query)
        
        for price in prices:
            occupancy = 0
            if price['total_seats'] > 0:
                occupancy = round(
                    (1 - price['available_seats'] / price['total_seats']) * 100, 2
                )
            
            snapshot = {
                'timestamp': datetime.now(),
                'base_price': float(price['base_price']),
                'current_price': float(price['current_price']),
                'surge_multiplier': float(price['surge_multiplier']),
                'available_seats': price['available_seats'],
                'total_seats': price['total_seats'],
                'occupancy_rate': occupancy,
                'triggered_by': 'bulk_sync'
            }
            
            self.mongo.price_history.update_one(
                {'flight_id': price['flight_id']},
                {
                    '$push': {'price_snapshots': snapshot},
                    '$set': {'updated_at': datetime.now()},
                    '$setOnInsert': {
                        'flight_code': price['flight_code'],
                        'route': {
                            'origin': price['origin'],
                            'destination': price['destination']
                        },
                        'created_at': datetime.now()
                    }
                },
                upsert=True
            )
        
        print(f"[Bulk Sync] Synced {len(prices)} price records")
    
    def sync_all_reviews(self):
        """Sync all reviews to MongoDB"""
        print("[Bulk Sync] Syncing all reviews...")
        
        query = """
            SELECT r.*, f.flight_code, f.origin, f.destination
            FROM reviews r
            JOIN flights f ON r.flight_id = f.flight_id
        """
        reviews = self.pg.execute(query)
        
        for review in reviews:
            review_doc = {
                'flight_id': review['flight_id'],
                'customer_id': review['cust_id'],
                'booking_id': review['booking_id'],
                'rating': review['rating'],
                'review': {'title': review['title'], 'comment': review['comment']},
                'category_ratings': {
                    'meal': review['meal_rating'],
                    'service': review['service_rating'],
                    'comfort': review['comfort_rating']
                },
                'flight_details': {
                    'flight_code': review['flight_code'],
                    'route': f"{review['origin']} → {review['destination']}"
                },
                'helpful_votes': review['helpful_count'],
                'status': review['status'].lower(),
                'created_at': review['review_date'],
                'updated_at': datetime.now()
            }
            
            self.mongo.flight_reviews.update_one(
                {'customer_id': review['cust_id'], 'booking_id': review['booking_id']},
                {'$set': review_doc},
                upsert=True
            )
        
        print(f"[Bulk Sync] Synced {len(reviews)} review records")
    
    def sync_all(self):
        """Perform full bulk sync"""
        print("[Bulk Sync] Starting full sync...")
        self.sync_all_prices()
        self.sync_all_reviews()
        print("[Bulk Sync] Full sync completed")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == '--bulk':
        bulk_sync = BulkSyncService()
        bulk_sync.sync_all()
    else:
        sync_service = MongoDBSyncService()
        try:
            sync_service.run()
        except KeyboardInterrupt:
            sync_service.stop()
