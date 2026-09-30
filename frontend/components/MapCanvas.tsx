"use client";

import React, { useEffect, useRef, useState } from "react";
import { Search, Sparkles, Plus } from "lucide-react";
import IngestModal from "./IngestModal";

interface Place {
  id: string;
  name: string;
  source_type: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  taste_match_score: number | null;
}

export default function MapCanvas() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // San Francisco default coordinates
  const [lat] = useState(37.767);
  const [lng] = useState(-122.4225);
  const [vibeQuery, setVibeQuery] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    // Dynamically import maplibre-gl to avoid SSR issues in Next.js App Router
    import("maplibre-gl").then((maplibregl) => {
      if (!mapContainer.current) return;

      const MapClass = maplibregl.Map || (maplibregl as any).default?.Map;
      const NavControlClass =
        maplibregl.NavigationControl ||
        (maplibregl as any).default?.NavigationControl;

      map.current = new MapClass({
        container: mapContainer.current,
        style: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
        center: [lng, lat],
        zoom: 13,
      });

      map.current.addControl(new NavControlClass(), "top-right");

      // Ensure canvas recalculates size cleanly upon tile loading
      map.current.on("load", () => {
        setTimeout(() => {
          map.current?.resize();
        }, 100);
      });

      fetchNearbyPlaces(lat, lng, "", maplibregl);
    });
  }, []);

  const fetchNearbyPlaces = async (
    searchLat: number,
    searchLng: number,
    vibe: string,
    maplibreglInstance?: any
  ) => {
    setLoading(true);
    try {
      let url = `http://127.0.0.1:8000/api/v1/map/places?latitude=${searchLat}&longitude=${searchLng}&radius_meters=5000`;
      if (vibe.trim()) {
        url += `&query_vibe=${encodeURIComponent(vibe)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");

      const data = await res.json();
      setPlaces(data.places);
      renderMarkers(data.places, maplibreglInstance);
    } catch (err) {
      console.error("Failed to fetch map places:", err);
    } finally {
      setLoading(false);
    }
  };

  const renderMarkers = (venueList: Place[], maplibreglInstance?: any) => {
    if (!map.current) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const createMarker = (lib: any) => {
      const PopupClass = lib.Popup || lib.default?.Popup;
      const MarkerClass = lib.Marker || lib.default?.Marker;

      venueList.forEach((place) => {
        const isSaved = place.source_type !== "discovered";
        const matchScore = place.taste_match_score;

        const el = document.createElement("div");
        el.className = `flex items-center justify-center w-8 h-8 rounded-full border-2 border-white shadow-lg cursor-pointer transform hover:scale-110 transition-transform ${
          isSaved
            ? "bg-amber-500 text-white"
            : matchScore && matchScore > 0.75
            ? "bg-purple-600 text-white"
            : "bg-blue-500 text-white"
        }`;

        el.innerHTML = `<span class="text-xs font-bold">${
          matchScore ? Math.round(matchScore * 100) + "%" : "📍"
        }</span>`;

        const popup = new PopupClass({ offset: 25 }).setHTML(`
          <div class="p-2">
            <h3 class="font-bold text-sm text-gray-900">${place.name}</h3>
            <p class="text-xs text-gray-500 capitalize">Source: ${place.source_type}</p>
            <p class="text-xs text-gray-500">${place.distance_meters}m away</p>
            ${
              matchScore
                ? `<div class="mt-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">Match: ${Math.round(
                    matchScore * 100
                  )}%</div>`
                : ""
            }
          </div>
        `);

        const marker = new MarkerClass({ element: el })
          .setLngLat([place.longitude, place.latitude])
          .setPopup(popup)
          .addTo(map.current!);

        markersRef.current.push(marker);
      });
    };

    if (maplibreglInstance) {
      createMarker(maplibreglInstance);
    } else {
      import("maplibre-gl").then((lib) => createMarker(lib));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNearbyPlaces(lat, lng, vibeQuery);
  };

  return (
    <div className="relative w-screen h-screen">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Top Floating Controls */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-11/12 max-w-2xl z-10 flex items-center gap-3">
        {/* Vibe Search Input */}
        <form
          onSubmit={handleSearch}
          className="flex-1 flex items-center bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-xl border border-gray-200/80 gap-2"
        >
          <Sparkles className="w-5 h-5 text-purple-600 animate-pulse shrink-0" />
          <input
            type="text"
            placeholder="Search vibes (e.g. cozy industrial espresso, upscale Indian)..."
            value={vibeQuery}
            onChange={(e) => setVibeQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-xl transition-colors shadow-md disabled:opacity-50 shrink-0"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Ingest Spot Button */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-2xl shadow-xl font-medium text-sm transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Ingest Spot</span>
        </button>
      </div>

      {/* Spot Counter Pill */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md text-xs font-medium text-gray-700 border border-gray-200">
        Showing {places.length} nearby spots
      </div>

      {/* Ingest Modal */}
      <IngestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => fetchNearbyPlaces(lat, lng, vibeQuery)}
      />
    </div>
  );
}