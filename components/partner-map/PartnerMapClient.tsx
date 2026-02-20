"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search, RefreshCw, Building2, Truck, Target } from "lucide-react";
import "leaflet/dist/leaflet.css";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Partner {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  partner_type: string;
  pipeline_status: string | null;
  phone: string | null;
  website: string | null;
  latitude: number;
  longitude: number;
  delivery_radius_miles: number | null;
}

// ─── Dynamically Import Map Components (SSR disabled) ───────────────────────

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((m) => m.CircleMarker),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((m) => m.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((m) => m.Popup),
  { ssr: false }
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function isPartnerCovered(
  monument: Partner,
  fulfillmentPartners: Partner[]
): boolean {
  return fulfillmentPartners.some((fp) => {
    if (!fp.delivery_radius_miles || fp.delivery_radius_miles <= 0) return false;
    const distance = calculateDistance(
      monument.latitude,
      monument.longitude,
      fp.latitude,
      fp.longitude
    );
    return distance <= fp.delivery_radius_miles;
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PartnerMapClient() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.32, -111.09]);
  const [mapKey, setMapKey] = useState(0); // Force map re-render when centering
  const [editingRadius, setEditingRadius] = useState<{ id: string; value: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/partner-map");
      const data = await res.json();
      setPartners(data.partners || []);
    } catch (e) {
      console.error("Failed to load partner map data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Separate monument companies and fulfillment partners
  const monumentCompanies = useMemo(
    () => partners.filter((p) => p.partner_type === "monument_company"),
    [partners]
  );

  const fulfillmentPartners = useMemo(
    () => partners.filter((p) => p.partner_type === "fulfillment_partner"),
    [partners]
  );

  // Filter by search term
  const filteredMonuments = useMemo(
    () =>
      monumentCompanies.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [monumentCompanies, searchTerm]
  );

  const filteredFulfillment = useMemo(
    () =>
      fulfillmentPartners.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [fulfillmentPartners, searchTerm]
  );

  // Coverage stats
  const coverageStats = useMemo(() => {
    const covered = monumentCompanies.filter((m) =>
      isPartnerCovered(m, fulfillmentPartners)
    ).length;
    const total = monumentCompanies.length;
    const percentage = total > 0 ? ((covered / total) * 100).toFixed(1) : "0.0";
    return { covered, total, percentage };
  }, [monumentCompanies, fulfillmentPartners]);

  const handlePanToPartner = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapKey((prev) => prev + 1);
  };

  const handleUpdateRadius = async (partnerId: string, newRadius: number) => {
    try {
      const res = await fetch(`/api/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_radius_miles: newRadius }),
      });

      if (res.ok) {
        await fetchData();
        setEditingRadius(null);
      }
    } catch (e) {
      console.error("Failed to update radius:", e);
    }
  };

  return (
    <div className="fixed inset-0 top-0 left-64 flex bg-zinc-900">
      {/* Map Container */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[#555] text-sm">Loading map...</p>
          </div>
        ) : (
          <MapContainer
            key={mapKey}
            center={mapCenter}
            zoom={7}
            style={{ height: "100%", width: "100%", background: "#111" }}
            zoomControl={true}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {/* Delivery Radius Circles */}
            {fulfillmentPartners.map((fp) => {
              if (!fp.delivery_radius_miles || fp.delivery_radius_miles <= 0) return null;
              return (
                <Circle
                  key={`radius-${fp.id}`}
                  center={[fp.latitude, fp.longitude]}
                  radius={fp.delivery_radius_miles * 1609.34}
                  pathOptions={{
                    color: "#f59e0b",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.15,
                    opacity: 0.4,
                    weight: 2,
                  }}
                />
              );
            })}

            {/* Monument Company Markers */}
            {monumentCompanies.map((m) => {
              const isCovered = isPartnerCovered(m, fulfillmentPartners);
              return (
                <CircleMarker
                  key={`monument-${m.id}`}
                  center={[m.latitude, m.longitude]}
                  radius={isCovered ? 8 : 12}
                  pathOptions={{
                    color: isCovered ? "#10b981" : "#ef4444",
                    fillColor: isCovered ? "#10b981" : "#ef4444",
                    fillOpacity: 0.8,
                    weight: isCovered ? 2 : 3,
                    className: isCovered ? "" : "pulse-marker",
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-white mb-1">{m.name}</p>
                      {(m.city || m.state) && (
                        <p className="text-xs text-[#888] mb-2">
                          {[m.city, m.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      {m.pipeline_status && (
                        <p className="text-xs text-[#888] mb-1">
                          Status: <span className="text-[#10b981]">{m.pipeline_status}</span>
                        </p>
                      )}
                      {m.phone && (
                        <p className="text-xs text-[#888] mb-1">📞 {m.phone}</p>
                      )}
                      {m.website && (
                        <a
                          href={m.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#10b981] hover:underline block"
                        >
                          🌐 {m.website.replace(/^https?:\/\//, "")}
                        </a>
                      )}
                      {!isCovered && (
                        <p className="text-xs text-[#ef4444] mt-2 font-semibold">
                          ⚠️ No fulfillment coverage
                        </p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Fulfillment Partner Markers */}
            {fulfillmentPartners.map((fp) => (
              <CircleMarker
                key={`fulfillment-${fp.id}`}
                center={[fp.latitude, fp.longitude]}
                radius={10}
                pathOptions={{
                  color: "#f59e0b",
                  fillColor: "#f59e0b",
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-white mb-1">{fp.name}</p>
                    {(fp.city || fp.state) && (
                      <p className="text-xs text-[#888] mb-2">
                        {[fp.city, fp.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {fp.delivery_radius_miles && fp.delivery_radius_miles > 0 && (
                      <p className="text-xs text-[#888] mb-1">
                        📍 Delivery radius: {fp.delivery_radius_miles} miles
                      </p>
                    )}
                    {fp.phone && (
                      <p className="text-xs text-[#888] mb-1">📞 {fp.phone}</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* Coverage Stats Bar (overlay on map) */}
        <div className="absolute top-4 left-4 bg-[#111]/95 border border-[#2a2a2a] rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm z-[1000]">
          <div className="flex items-center gap-3">
            <Target size={16} className="text-[#10b981]" />
            <div>
              <p className="text-xs text-[#555] uppercase tracking-wider">Coverage</p>
              <p className="text-lg font-bold text-white">
                {coverageStats.covered}/{coverageStats.total} monuments{" "}
                <span className="text-sm text-[#10b981]">({coverageStats.percentage}%)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-[350px] bg-[#111] border-l border-[#2a2a2a] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Partner Map</h2>
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-[#555] hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
            <Search size={14} className="text-[#555]" />
            <input
              type="text"
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-white placeholder-[#555] flex-1"
            />
          </div>
        </div>

        {/* Partner Lists */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Monument Companies */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={14} className="text-[#10b981]" />
              <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider">
                Monument Companies ({filteredMonuments.length})
              </h3>
            </div>
            <div className="space-y-2">
              {filteredMonuments.map((m) => {
                const isCovered = isPartnerCovered(m, fulfillmentPartners);
                return (
                  <button
                    key={m.id}
                    onClick={() => handlePanToPartner(m.latitude, m.longitude)}
                    className="w-full text-left bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#10b981]/50 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate group-hover:text-[#10b981]">
                          {m.name}
                        </p>
                        {(m.city || m.state) && (
                          <p className="text-xs text-[#555] mt-0.5">
                            {[m.city, m.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                          isCovered ? "bg-[#10b981]" : "bg-[#ef4444] animate-pulse"
                        }`}
                        title={isCovered ? "Covered" : "No coverage"}
                      />
                    </div>
                  </button>
                );
              })}
              {filteredMonuments.length === 0 && (
                <p className="text-xs text-[#555] text-center py-4">No monument companies</p>
              )}
            </div>
          </div>

          {/* Fulfillment Partners */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Truck size={14} className="text-[#f59e0b]" />
              <h3 className="text-xs font-semibold text-[#f59e0b] uppercase tracking-wider">
                Fulfillment Partners ({filteredFulfillment.length})
              </h3>
            </div>
            <div className="space-y-2">
              {filteredFulfillment.map((fp) => (
                <button
                  key={fp.id}
                  onClick={() => handlePanToPartner(fp.latitude, fp.longitude)}
                  className="w-full text-left bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#f59e0b]/50 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#f59e0b]">
                      {fp.name}
                    </p>
                    {(fp.city || fp.state) && (
                      <p className="text-xs text-[#555] mt-0.5">
                        {[fp.city, fp.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    
                    {/* Editable delivery radius */}
                    <div className="mt-2">
                      {editingRadius?.id === fp.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={editingRadius.value}
                            onChange={(e) =>
                              setEditingRadius({ id: fp.id, value: e.target.value })
                            }
                            onBlur={() => {
                              const val = parseFloat(editingRadius.value);
                              if (!isNaN(val) && val >= 0) {
                                handleUpdateRadius(fp.id, val);
                              } else {
                                setEditingRadius(null);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = parseFloat(editingRadius.value);
                                if (!isNaN(val) && val >= 0) {
                                  handleUpdateRadius(fp.id, val);
                                }
                              } else if (e.key === "Escape") {
                                setEditingRadius(null);
                              }
                            }}
                            className="w-20 px-2 py-1 text-xs bg-[#0a0a0a] border border-[#f59e0b]/50 rounded text-white outline-none"
                            autoFocus
                          />
                          <span className="text-xs text-[#888]">miles</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRadius({
                              id: fp.id,
                              value: String(fp.delivery_radius_miles || 0),
                            });
                          }}
                          className="text-xs text-[#888] hover:text-[#f59e0b] transition-colors"
                        >
                          📍 Radius: {fp.delivery_radius_miles || 0} miles (click to edit)
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              {filteredFulfillment.length === 0 && (
                <p className="text-xs text-[#555] text-center py-4">No fulfillment partners</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS for pulsing marker animation */}
      <style jsx global>{`
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .pulse-marker {
          animation: pulse-ring 1.5s infinite;
        }
      `}</style>
    </div>
  );
}
