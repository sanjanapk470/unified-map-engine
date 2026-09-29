"""
embedding_service.py: Local Taste & Semantic Processing Engine

1. Loads a free, local HuggingFace transformer model (all-MiniLM-L6-v2) on CPU.
2. Converts unstructured venue descriptions/vibes into 384-dimensional vector embeddings.
3. Outputs vector arrays to pgvector for sub-second semantic taste-matching (0-100%).
"""


from sentence_transformers import SentenceTransformer
from typing import List

class TasteEmbeddingEngine:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        print(f"Loading local embedding model: {model_name}...")
        # Downloads model once locally on first run (~80MB)
        self.model = SentenceTransformer(model_name)
        print("Model loaded successfully!")

    def generate_embedding(self, text: str) -> List[float]:
        """
        Converts text (e.g., 'cozy natural wine bar with low lighting and small plates')
        into a 384-dimensional float vector.
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty.")
        
        embedding = self.model.encode(text)
        return embedding.tolist()

# Quick test if run directly
if __name__ == "__main__":
    engine = TasteEmbeddingEngine()
    sample_vector = engine.generate_embedding("Natural wine bar with sourdough pizza and low noise")
    print(f"Generated Vector Length: {len(sample_vector)}")
    print(f"Sample Vector First 5 Values: {sample_vector[:5]}")