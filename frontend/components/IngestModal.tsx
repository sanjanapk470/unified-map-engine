"use client";

import React, { useState } from "react";
import { Plus, X, MapPin, Sparkles } from "lucide-react";

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function IngestModal({ isOpen, onClose, onSuccess }: IngestModalProps) {
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState("beli");
  const [sourceUrl, setSourceUrl] = useState("");
  const [vibeDescription, setVibeDescription] = useState("");
  const [latitude, setLatitude] = useState(37.7879);
  const [longitude, setLongitude] = useState(-122.4075);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          source_type: sourceType,
          source_url: sourceUrl || null,
          vibe_description: vibeDescription,
          latitude: parseFloat(latitude.toString()),
          longitude: parseFloat(longitude.toString()),
        }),
      });

      if (!res.ok) throw new Error("Failed to ingest place");

      // Reset form & trigger map refresh
      setName("");
      setSourceUrl("");
      setVibeDescription("");
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error ingesting spot:", err);
      alert("Error ingesting spot. Check backend logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-bold text-gray-900">Ingest New Spot</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Place Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Rooh SF"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Source</label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              >
                <option value="beli">Beli</option>
                <option value="instagram">Instagram</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Source Link (Optional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Vibe & Taste Description</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Upscale progressive Indian dining, inventive cocktails, stylish chic ambience, perfect for family dinners"
              value={vibeDescription}
              onChange={(e) => setVibeDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium shadow-md transition-colors disabled:opacity-50"
            >
              {loading ? "Ingesting..." : "Save Spot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}