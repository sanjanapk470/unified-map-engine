### Key Updates Needed

1. **Prerequisites & Setup:** Update Step 1 under `🚀 Getting Started` to highlight `docker-compose up -d --build` (mentioning `Dockerfile.db` handles PostGIS + pgvector automatically).
2. **Architecture Text:** Ensure PostGIS and pgvector setup mentions the single container build.
3. **Clean Copy Check:** Verify there is no duplicate header copy left over from earlier edits.

---

### Updated `README.md` Template

Replace your `README.md` with this updated version:

```markdown
# Spatial Taste Discovery Engine

An end-to-end spatial recommendation platform that bridges personal saved spots (from Instagram reels, Beli, and unstructured notes) with unknown local venue discovery. By unifying multi-source ingestion, spatial indexing, and local vector similarity matching, the application eliminates fragmented map lookups and delivers real-time, personalized taste-match scores on a unified map.

---

## 🏗️ System Architecture

```text
                                 USER INTERFACE
                    +------------------------------------+
                    |   Next.js Mobile-First Web App     |
                    |   (MapLibre GL JS Map Rendering)   |
                    +-----------------+------------------+
                                      |
                           HTTPS      |  JSON / GeoJSON
                                      v
                               FASTAPI BACKEND
        +--------------------------------------------------------------+
        |                                                              |
        |  [1] INGESTION ROUTE         [2] UNIFIED SEARCH ROUTE        |
        |  Accepts URL / Raw Text      Receives Lat, Long, Radius      |
        |           |                              |                   |
        +-----------|------------------------------|-------------------+
                    |                              |
                    v                              v
           BACKGROUND WORKER               SPATIAL & VECTOR ENGINE
        +-----------------------+     +-------------------------------+
        | [Worker]              |     | 1. Query Google Places / OSM  |
        | Parses IG / Text link |     | 2. Check Redis API Cache      |
        | Extracts place info   |     | 3. PostGIS ST_DWithin Query   |
        | Runs Embedding Model  |     | 4. pgvector Cosine Distance   |
        +-----------+-----------+     +---------------+---------------+
                    |                                 |
                    v                                 v
        +--------------------------------------------------------------+
        |                     PERSISTENCE LAYER                        |
        |                                                              |
        |  PostgreSQL Database + Extensions                            |
        |  - PostGIS (GIST Spatial Index for Coordinate Queries)      |
        |  - pgvector (HNSW Index for Cosine Similarity Matching)      |
        |                                                              |
        |  Redis Cache                                                 |
        |  - Caches third-party API payloads to optimize latency       |
        +--------------------------------------------------------------+

```

---

## ✨ Key Features

* **Unified Visual Map Layering:** Differentiates explicit saved spots (Gold Pins), local discovered places (Blue Pins), and high-match taste overlaps (Purple Pins) on a single vector map canvas.
* **Geospatial Radial Retrieval:** Executes sub-10ms radial queries (`ST_DWithin`) using PostGIS spatial indexing to isolate venues within walking distance.
* **Local Vector Taste Scoring:** Generates 384-dimensional text embeddings (`all-MiniLM-L6-v2`) from saved places and computes real-time cosine similarity scores (`pgvector`) against unknown local spots.
* **Zero-Latency Redis Caching:** Caches third-party venue payloads in Redis to bypass redundant API network requests and keep end-to-end map renders under 200ms.
* **Unstructured Data Ingestion:** Extracts structured place metadata, categories, and attributes from raw links or text snippets via asynchronous workers.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (React), MapLibre GL JS, Tailwind CSS
* **Backend:** FastAPI (Python 3.10+), Pydantic, SentenceTransformers
* **Database & Caching:** PostgreSQL 16 (PostGIS + `pgvector` extensions via `Dockerfile.db`), Redis
* **Infrastructure:** Docker & Docker Compose

---

## 🚀 Getting Started

### Prerequisites

* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
* Python 3.10+

### 1. Clone & Set Up Infrastructure

```bash
git clone [https://github.com/your-username/spatial-taste-discovery.git](https://github.com/your-username/spatial-taste-discovery.git)
cd spatial-taste-discovery

# Copy environment template
cp .env.example .env

# Spin up PostgreSQL (PostGIS + pgvector) & Redis containers
docker-compose --env-file .env up -d --build

```

### 2. Verify Database & Insert Test Data

To verify database functionality and vector extension setup:

```bash
# Activate Python virtual environment and run vector insertion test
source venv/bin/activate
python database.py

```

To inspect stored records inside `psql`:

```bash
docker exec -it map_db psql -U postgres -d unified_map -c "SELECT id, name, source_type, ST_AsText(location) FROM saved_places;"

```

---

## 🧪 Database Schema Overview

```sql
-- Saved / Ingested Places
CREATE TABLE saved_places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    source_type VARCHAR(50) NOT NULL,
    source_url TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    taste_embedding vector(384),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Spatial & Vector Indexes
CREATE INDEX idx_saved_places_location ON saved_places USING GIST (location);
CREATE INDEX idx_saved_places_embedding ON saved_places USING hnsw (taste_embedding vector_cosine_ops);

```

---

## 🛰️ API Reference

### `POST /api/v1/ingest`

Ingests an unstructured link or raw text snippet, parses place attributes, generates a 384-dim embedding, and persists coordinates to PostGIS.

### `GET /api/v1/map/places`

Returns a unified GeoJSON payload of saved and discovered venues within a given radius.

**Query Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `latitude` | `float` | User's current latitude coordinate |
| `longitude` | `float` | User's current longitude coordinate |
| `radius_meters` | `int` | Search radius in meters (e.g., `1000`) |

```