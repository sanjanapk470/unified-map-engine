from pydantic import BaseModel, HttpUrl, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class PlaceIngestRequest(BaseModel):
    name: str = Field(..., example="Four Barrel Coffee")
    source_type: str = Field(..., example="instagram", description="instagram, beli, or manual")
    source_url: Optional[str] = Field(None, example="https://instagram.com/reel/sample")
    vibe_description: str = Field(
        ..., 
        example="Cozy industrial coffee shop with specialty espresso and spacious seating",
        description="Raw text/notes used to generate 384-dim taste vector"
    )
    latitude: float = Field(..., ge=-90, le=90, example=37.7670)
    longitude: float = Field(..., ge=-180, le=180, example=-122.4225)

class PlaceIngestResponse(BaseModel):
    id: UUID
    name: str
    source_type: str
    latitude: float
    longitude: float
    vector_dims: int
    message: str
    created_at: datetime

from typing import List

class PlaceSearchItem(BaseModel):
    id: str
    name: str
    source_type: str
    latitude: float
    longitude: float
    distance_meters: float
    taste_match_score: Optional[float] = Field(
        None, 
        example=0.88, 
        description="Cosine similarity score (0.0 to 1.0) against vibe query"
    )

class UnifiedMapResponse(BaseModel):
    total_count: int
    user_location: dict
    radius_meters: float
    places: List[PlaceSearchItem]