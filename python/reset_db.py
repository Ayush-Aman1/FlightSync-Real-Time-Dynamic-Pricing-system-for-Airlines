import psycopg2
import os
from config import config

# 1. Define the order of SQL files
SQL_FILES = [
    '/Users/admin/Downloads/flightsync/sql/01_schema.sql',
    '/Users/admin/Downloads/flightsync/sql/02_triggers.sql',
    '/Users/admin/Downloads/flightsync/sql/03_views.sql',
    '/Users/admin/Downloads/flightsync/sql/05_queries.sql',  # This file must contain the ::VARCHAR fix!
    '/Users/admin/Downloads/flightsync/sql/04_sample_data.sql'
]

# Note: Adjust the path '../' above if your SQL files are in a specific 'sql' folder 
# (e.g., '../sql/01_schema.sql')

def get_db_connection(db_name='postgres'):
    conn = psycopg2.connect(
        host=config.pg.host,
        user=config.pg.user,
        password=config.pg.password,
        database=db_name,
        port=config.pg.port
    )
    conn.autocommit = True
    return conn

def reset_database():
    print("⚠️  Starting Database Factory Reset...")
    
    # Step 1: Drop and Recreate Database
    try:
        # Connect to 'postgres' (default system DB) to perform administrative tasks
        conn = get_db_connection('postgres')
        cur = conn.cursor()
        
        print("   Dropping old database...")
        cur.execute("DROP DATABASE IF EXISTS flightsync;")
        
        print("   Creating fresh database...")
        cur.execute("CREATE DATABASE flightsync;")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error resetting database: {e}")
        return

    # Step 2: Run SQL Files
    print("   Applying SQL scripts...")
    try:
        # Connect to the new 'flightsync' database
        conn = get_db_connection('flightsync')
        cur = conn.cursor()
        
        for file_path in SQL_FILES:
            # Check if file exists
            if not os.path.exists(file_path):
                # Try looking in current directory if ../ fails
                alt_path = file_path.replace('../', '')
                if os.path.exists(alt_path):
                    file_path = alt_path
                else:
                    print(f"❌ File not found: {file_path}")
                    continue
            
            print(f"   Executing {file_path}...")
            with open(file_path, 'r') as f:
                sql_script = f.read()
                cur.execute(sql_script)
                
        print("✅ Database reset complete! Ready for React integration.")
        conn.close()
        
    except Exception as e:
        print(f"❌ Error applying SQL scripts: {e}")

if __name__ == "__main__":
    reset_database()