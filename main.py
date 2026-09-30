import os
from typing import Optional
import psycopg
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from embedding_service import TasteEmbeddingEngine
from schemas import (
    PlaceIngestRequest,
    PlaceIngestResponse,
    PlaceSearchItem,
    UnifiedMapResponse,
)

load_dotenv()

# Database Config (Strictly environment variables)
DB_USER = os.environ["POSTGRES_USER"]
DB_PASSWORD = os.environ["POSTGRES_PASSWORD"]
DB_HOST = os.environ["POSTGRES_HOST"]
DB_PORT = os.environ["POSTGRES_PORT"]
DB_NAME = os.environ["POSTGRES_DB"]

CONN_STRING = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Initialize FastAPI App
app = FastAPI(
    title="Spatial Taste Discovery Engine",
    version="1.0.0",
    description="Backend API combining PostGIS spatial lookups with pgvector taste embeddings.",
)

# Enable CORS for Next.js Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Embedding Engine Instance
embedding_engine = None


@app.on_event("startup")
def startup_event():
    global embedding_engine
    print("Initializing local HuggingFace embedding engine...")
    embedding_engine = TasteEmbeddingEngine()
    print("API ready to process vector requests.")


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Simple health check to verify backend & database reachability."""
    try:
        with psycopg.connect(CONN_STRING) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1;")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection failed: {str(e)}",
        )


@app.post(
    "/api/v1/ingest",
    response_model=PlaceIngestResponse,
    status_code=status.HTTP_201_CREATED,
)
def ingest_place(payload: PlaceIngestRequest):
    """Ingests an explicit saved spot, generates a 384-dim taste vector on CPU,

    and persists spatial coordinates into PostGIS.
    """
    if not embedding_engine:
        raise HTTPException(status_code=500, detail="Embedding engine not loaded.")

    try:
        # 1. Generate 384-dimensional vector from vibe text
        vector = embedding_engine.generate_embedding(payload.vibe_description)

        # 2. Insert into PostGIS + pgvector
        with psycopg.connect(CONN_STRING) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO saved_places (name, source_type, source_url, location, taste_embedding)
                    VALUES (
                        %s, 
                        %s, 
                        %s,
                        ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 
                        %s::vector
                    )
                    RETURNING id, created_at;
                """,
                    (
                        payload.name,
                        payload.source_type,
                        payload.source_url,
                        payload.longitude,
                        payload.latitude,
                        str(vector),
                    ),
                )

                result = cur.fetchone()
                inserted_id, created_at = result[0], result[1]
                conn.commit()

        return PlaceIngestResponse(
            id=inserted_id,
            name=payload.name,
            source_type=payload.source_type,
            latitude=payload.latitude,
            longitude=payload.longitude,
            vector_dims=len(vector),
            message="Spot successfully ingested and indexed.",
            created_at=created_at,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion failed: {str(e)}",
        )


@app.get(
    "/api/v1/map/places",
    response_model=UnifiedMapResponse,
    status_code=status.HTTP_200_OK,
)
def search_places(
    latitude: float = Query(..., ge=-90, le=90, example=37.7670),
    longitude: float = Query(..., ge=-180, le=180, example=-122.4225),
    radius_meters: float = Query(
        2000.0, ge=100, le=50000, description="Search radius in meters"
    ),
    query_vibe: Optional[str] = Query(
        None,
        example="specialty coffee espresso",
        description="Optional taste query",
    ),
):
    """Unified Spatial + Vector Search Route:

    - PostGIS ST_DWithin filters venues within radius_meters.
    - pgvector calculates cosine distance similarity score if query_vibe is
    provided.
    """
    try:
        # Generate query vector if user passed a vibe text query
        query_vector = None
        if query_vibe and embedding_engine:
            query_vector = str(embedding_engine.generate_embedding(query_vibe))

        with psycopg.connect(CONN_STRING) as conn:
            with conn.cursor() as cur:
                if query_vector:
                    # Spatial filter + pgvector cosine similarity calculation
                    sql = """
                        SELECT 
                            id::text, 
                            name, 
                            source_type, 
                            ST_Y(location::geometry) as lat, 
                            ST_X(location::geometry) as lon,
                            ST_Distance(location, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) as dist_meters,
                            1 - (taste_embedding <=> %s::vector) as similarity_score
                        FROM saved_places
                        WHERE ST_DWithin(
                            location, 
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 
                            %s
                        )
                        ORDER BY similarity_score DESC;
                    """
                    cur.execute(
                        sql,
                        (
                            longitude,
                            latitude,
                            query_vector,
                            longitude,
                            latitude,
                            radius_meters,
                        ),
                    )
                else:
                    # Spatial filter ordered by proximity
                    sql = """
                        SELECT 
                            id::text, 
                            name, 
                            source_type, 
                            ST_Y(location::geometry) as lat, 
                            ST_X(location::geometry) as lon,
                            ST_Distance(location, ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography) as dist_meters,
                            NULL as similarity_score
                        FROM saved_places
                        WHERE ST_DWithin(
                            location, 
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326)::geography, 
                            %s
                        )
                        ORDER BY dist_meters ASC;
                    """
                    cur.execute(
                        sql,
                        (longitude, latitude, longitude, latitude, radius_meters),
                    )

                rows = cur.fetchall()

        places = [
            PlaceSearchItem(
                id=row[0],
                name=row[1],
                source_type=row[2],
                latitude=row[3],
                longitude=row[4],
                distance_meters=round(row[5], 2),
                taste_match_score=round(row[6], 4) if row[6] is not None else None,
            )
            for row in rows
        ]

        return UnifiedMapResponse(
            total_count=len(places),
            user_location={"latitude": latitude, "longitude": longitude},
            radius_meters=radius_meters,
            places=places,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Spatial vector search failed: {str(e)}",
        )