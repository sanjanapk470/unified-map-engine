# Create a file named database.py to test pushing an embedded venue directly 
# into your saved_places table in PostGIS:

import os
import psycopg
from dotenv import load_dotenv
from embedding_service import TasteEmbeddingEngine

load_dotenv()

DB_USER = os.getenv("POSTGRES_USER", "postgres")
DB_PASSWORD = os.getenv("POSTGRES_PASSWORD", "postgrespassword")
DB_HOST = os.getenv("POSTGRES_HOST", "localhost")
DB_PORT = os.getenv("POSTGRES_PORT", "5432")
DB_NAME = os.getenv("POSTGRES_DB", "unified_map")

CONN_STRING = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def test_db_vector_insertion():
    # Initialize embedding engine
    engine = TasteEmbeddingEngine()
    
    place_name = "Four Barrel Coffee"
    source_type = "instagram"
    vibe_text = "Specialty espresso, industrial vibe, spacious seating, craft drip coffee"
    
    # 1. Generate 384-dim vector
    vector = engine.generate_embedding(vibe_text)
    
    # Coordinates for Four Barrel Coffee in SF (lng, lat)
    lng = -122.4225
    lat = 37.7670
    
    # 2. Insert into PostGIS + pgvector
    with psycopg.connect(CONN_STRING) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO saved_places (name, source_type, location, taste_embedding)
                VALUES (
                    %s, 
                    %s, 
                    ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 
                    %s::vector
                )
                RETURNING id;
            """, (place_name, source_type, lng, lat, str(vector)))
            
            inserted_id = cur.fetchone()[0]
            conn.commit()
            print(f"Successfully inserted '{place_name}' into PostGIS/pgvector with ID: {inserted_id}")

if __name__ == "__main__":
    test_db_vector_insertion()