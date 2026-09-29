CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS saved_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    source_type VARCHAR(50) NOT NULL,
    source_url TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    taste_embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cached_venues (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    categories TEXT[],
    taste_embedding vector(384),
    last_fetched TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_saved_places_location ON saved_places USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_cached_venues_location ON cached_venues USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_saved_places_embedding ON saved_places USING hnsw (taste_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_cached_venues_embedding ON cached_venues USING hnsw (taste_embedding vector_cosine_ops);