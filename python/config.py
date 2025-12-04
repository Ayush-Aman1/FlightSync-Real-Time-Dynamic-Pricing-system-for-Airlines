
import os
from dataclasses import dataclass
from typing import Optional
from dotenv import load_dotenv

load_dotenv()


@dataclass
class PostgreSQLConfig:
    host: str = os.getenv('PG_HOST', 'localhost')
    port: int = int(os.getenv('PG_PORT', 5432))
    database: str = os.getenv('PG_DATABASE', 'flightsync')
    user: str = os.getenv('PG_USER', 'postgres')
    password: str = os.getenv('PG_PASSWORD', 'password')
    
    @property
    def connection_string(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"
    
    @property
    def connection_dict(self) -> dict:
        return {
            'host': self.host,
            'port': self.port,
            'database': self.database,
            'user': self.user,
            'password': self.password
        }


@dataclass
class MongoDBConfig:
    host: str = os.getenv('MONGO_HOST', 'localhost')
    port: int = int(os.getenv('MONGO_PORT', 27017))
    database: str = os.getenv('MONGO_DATABASE', 'flightsync')
    username: Optional[str] = os.getenv('MONGO_USER')
    password: Optional[str] = os.getenv('MONGO_PASSWORD')
    
    @property
    def connection_string(self) -> str:
        if self.username and self.password:
            return f"mongodb://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"
        return f"mongodb://{self.host}:{self.port}/{self.database}"


@dataclass
class AppConfig:
    debug: bool = os.getenv('DEBUG', 'False').lower() == 'true'
    secret_key: str = os.getenv('SECRET_KEY', 'your-secret-key-here')
    
    min_surge_multiplier: float = 0.5
    max_surge_multiplier: float = 5.0
    
    points_per_100_rupees: int = 1
    bronze_threshold: int = 0
    silver_threshold: int = 2000
    gold_threshold: int = 5000
    platinum_threshold: int = 10000
    
    cache_ttl_seconds: int = 300
    
    pg: PostgreSQLConfig = None
    
    mongo: MongoDBConfig = None
    
    def __post_init__(self):
        self.pg = PostgreSQLConfig()
        self.mongo = MongoDBConfig()


config = AppConfig()


class PostgreSQLConnection:
    
    def __init__(self, config: PostgreSQLConfig = None):
        self.config = config or PostgreSQLConfig()
        self._connection = None
    
    def connect(self):
        import psycopg2
        from psycopg2.extras import RealDictCursor
        
        if self._connection is None or self._connection.closed:
            self._connection = psycopg2.connect(
                **self.config.connection_dict,
                cursor_factory=RealDictCursor
            )
        return self._connection
    
    def execute(self, query: str, params: tuple = None):
        conn = self.connect()
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            if cursor.description:
                return cursor.fetchall()
            conn.commit()
            return None
    
    def execute_one(self, query: str, params: tuple = None):
        conn = self.connect()
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            if cursor.description:
                return cursor.fetchone()
            conn.commit()
            return None
    
    def close(self):
        if self._connection and not self._connection.closed:
            self._connection.close()
    
    def __enter__(self):
        return self.connect()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self._connection.rollback()
        else:
            self._connection.commit()


class MongoDBConnection:
    
    def __init__(self, config: MongoDBConfig = None):
        self.config = config or MongoDBConfig()
        self._client = None
        self._db = None
    
    def connect(self):
        from pymongo import MongoClient
        
        if self._client is None:
            self._client = MongoClient(self.config.connection_string)
            self._db = self._client[self.config.database]
        return self._db
    
    @property
    def db(self):
        return self.connect()
    
    @property
    def price_history(self):
        return self.db['price_history']
    
    @property
    def customer_behavior(self):
        return self.db['customer_behavior']
    
    @property
    def flight_reviews(self):
        return self.db['flight_reviews']
    
    @property
    def ai_pricing_insights(self):
        return self.db['ai_pricing_insights']
    
    @property
    def cached_flights(self):
        return self.db['cached_flights']
    
    def close(self):
        if self._client:
            self._client.close()
            self._client = None
            self._db = None


pg_conn = PostgreSQLConnection()
mongo_conn = MongoDBConnection()


def get_pg_connection() -> PostgreSQLConnection:
    return pg_conn


def get_mongo_connection() -> MongoDBConnection:
    return mongo_conn
