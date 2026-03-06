"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search, RefreshCw, Building2, Flower, Sparkles, Target, Eye, EyeOff } from "lucide-react";
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

type ServiceStatus = 'fully_serviced' | 'partially_serviced' | 'unserviced';
type QuickFilter = 'all' | 'flower_gaps' | 'cleaning_gaps' | 'fully_unserviced';

interface LayerToggles {
  memorials: {
    enabled: boolean;
    fully_serviced: boolean;
    partially_serviced: boolean;
    unserviced: boolean;
  };
  flowerPartners: {
    enabled: boolean;
    active: boolean;
  };
  cleaningPartners: {
    enabled: boolean;
    active: boolean;
  };
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

function calculateServiceStatus(
  memorial: Partner,
  flowerPartners: Partner[],
  cleaningPartners: Partner[]
): {
  status: ServiceStatus;
  hasFlowerService: boolean;
  hasCleaningService: boolean;
  nearestFlower?: { name: string; distance: number };
  nearestCleaning?: { name: string; distance: number };
} {
  // Check if memorial is within any flower partner's radius
  const hasFlowerService = flowerPartners.some((fp) => {
    if (!fp.delivery_radius_miles || fp.delivery_radius_miles <= 0) return false;
    const distance = calculateDistance(
      memorial.latitude,
      memorial.longitude,
      fp.latitude,
      fp.longitude
    );
    return distance <= fp.delivery_radius_miles;
  });

  // Check if memorial is within any cleaning partner's radius
  const hasCleaningService = cleaningPartners.some((cp) => {
    if (!cp.delivery_radius_miles || cp.delivery_radius_miles <= 0) return false;
    const distance = calculateDistance(
      memorial.latitude,
      memorial.longitude,
      cp.latitude,
      cp.longitude
    );
    return distance <= cp.delivery_radius_miles;
  });

  // Find nearest flower partner
  let nearestFlower: { name: string; distance: number } | undefined;
  if (flowerPartners.length > 0) {
    const distances = flowerPartners.map((fp) => ({
      name: fp.name,
      distance: calculateDistance(
        memorial.latitude,
        memorial.longitude,
        fp.latitude,
        fp.longitude
      ),
    }));
    nearestFlower = distances.reduce((min, curr) => 
      curr.distance < min.distance ? curr : min
    );
  }

  // Find nearest cleaning partner
  let nearestCleaning: { name: string; distance: number } | undefined;
  if (cleaningPartners.length > 0) {
    const distances = cleaningPartners.map((cp) => ({
      name: cp.name,
      distance: calculateDistance(
        memorial.latitude,
        memorial.longitude,
        cp.latitude,
        cp.longitude
      ),
    }));
    nearestCleaning = distances.reduce((min, curr) => 
      curr.distance < min.distance ? curr : min
    );
  }

  // Determine overall service status
  let status: ServiceStatus;
  if (hasFlowerService && hasCleaningService) {
    status = 'fully_serviced';
  } else if (hasFlowerService || hasCleaningService) {
    status = 'partially_serviced';
  } else {
    status = 'unserviced';
  }

  return { status, hasFlowerService, hasCleaningService, nearestFlower, nearestCleaning };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PartnerMapClient() {
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>([39.32, -111.09]);
  const [mapKey, setMapKey] = useState(0);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [layerToggles, setLayerToggles] = useState<LayerToggles>({
    memorials: {
      enabled: true,
      fully_serviced: true,
      partially_serviced: true,
      unserviced: true,
    },
    flowerPartners: {
      enabled: true,
      active: true,
    },
    cleaningPartners: {
      enabled: true,
      active: true,
    },
  });

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

  // Separate partners by type
  const memorials = useMemo(
    () => partners.filter((p) => p.partner_type === "monument_company"),
    [partners]
  );

  const flowerPartners = useMemo(
    () => partners.filter((p) => p.partner_type === "florist"),
    [partners]
  );

  const cleaningPartners = useMemo(
    () => partners.filter((p) => p.partner_type === "cleaning"),
    [partners]
  );

  // Calculate service status for each memorial
  const memorialsWithStatus = useMemo(() => {
    return memorials.map((memorial) => ({
      ...memorial,
      ...calculateServiceStatus(memorial, flowerPartners, cleaningPartners),
    }));
  }, [memorials, flowerPartners, cleaningPartners]);

  // Apply quick filters
  const filteredMemorials = useMemo(() => {
    let filtered = memorialsWithStatus;

    // Apply quick filter
    if (quickFilter === 'flower_gaps') {
      filtered = filtered.filter((m) => !m.hasFlowerService);
    } else if (quickFilter === 'cleaning_gaps') {
      filtered = filtered.filter((m) => !m.hasCleaningService);
    } else if (quickFilter === 'fully_unserviced') {
      filtered = filtered.filter((m) => m.status === 'unserviced');
    }

    // Apply layer toggles
    if (layerToggles.memorials.enabled) {
      filtered = filtered.filter((m) => {
        if (m.status === 'fully_serviced' && !layerToggles.memorials.fully_serviced) return false;
        if (m.status === 'partially_serviced' && !layerToggles.memorials.partially_serviced) return false;
        if (m.status === 'unserviced' && !layerToggles.memorials.unserviced) return false;
        return true;
      });
    } else {
      filtered = [];
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((m) =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [memorialsWithStatus, quickFilter, layerToggles, searchTerm]);

  const filteredFlowerPartners = useMemo(() => {
    if (!layerToggles.flowerPartners.enabled || !layerToggles.flowerPartners.active) return [];
    if (quickFilter === 'flower_gaps') return [];
    if (searchTerm) {
      return flowerPartners.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return flowerPartners;
  }, [flowerPartners, layerToggles, quickFilter, searchTerm]);

  const filteredCleaningPartners = useMemo(() => {
    if (!layerToggles.cleaningPartners.enabled || !layerToggles.cleaningPartners.active) return [];
    if (quickFilter === 'cleaning_gaps') return [];
    if (searchTerm) {
      return cleaningPartners.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return cleaningPartners;
  }, [cleaningPartners, layerToggles, quickFilter, searchTerm]);

  // Coverage stats
  const coverageStats = useMemo(() => {
    const fullyServiced = memorialsWithStatus.filter((m) => m.status === 'fully_serviced').length;
    const partiallyServiced = memorialsWithStatus.filter((m) => m.status === 'partially_serviced').length;
    const unserviced = memorialsWithStatus.filter((m) => m.status === 'unserviced').length;
    const total = memorialsWithStatus.length;
    const percentage = total > 0 ? ((fullyServiced / total) * 100).toFixed(1) : "0.0";
    return { fullyServiced, partiallyServiced, unserviced, total, percentage };
  }, [memorialsWithStatus]);

  const handlePanToPartner = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setMapKey((prev) => prev + 1);
  };

  const toggleLayer = (layer: keyof LayerToggles, subKey?: string) => {
    setLayerToggles((prev) => {
      if (subKey) {
        return {
          ...prev,
          [layer]: {
            ...prev[layer],
            [subKey]: !prev[layer][subKey as keyof typeof prev[typeof layer]],
          },
        };
      } else {
        return {
          ...prev,
          [layer]: {
            ...prev[layer],
            enabled: !prev[layer].enabled,
          },
        };
      }
    });
  };

  const handleQuickFilter = (filter: QuickFilter) => {
    setQuickFilter(filter);
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

            {/* Flower Partner Coverage Circles */}
            {filteredFlowerPartners.map((fp) => {
              if (!fp.delivery_radius_miles || fp.delivery_radius_miles <= 0) return null;
              return (
                <Circle
                  key={`radius-flower-${fp.id}`}
                  center={[fp.latitude, fp.longitude]}
                  radius={fp.delivery_radius_miles * 1609.34}
                  pathOptions={{
                    color: "#3b82f6",
                    fillColor: "#3b82f6",
                    fillOpacity: 0.15,
                    opacity: 0.4,
                    weight: 2,
                  }}
                />
              );
            })}

            {/* Cleaning Partner Coverage Circles */}
            {filteredCleaningPartners.map((cp) => {
              if (!cp.delivery_radius_miles || cp.delivery_radius_miles <= 0) return null;
              return (
                <Circle
                  key={`radius-cleaning-${cp.id}`}
                  center={[cp.latitude, cp.longitude]}
                  radius={cp.delivery_radius_miles * 1609.34}
                  pathOptions={{
                    color: "#a855f7",
                    fillColor: "#a855f7",
                    fillOpacity: 0.15,
                    opacity: 0.4,
                    weight: 2,
                  }}
                />
              );
            })}

            {/* Memorial Markers */}
            {filteredMemorials.map((m) => {
              const color = m.status === 'fully_serviced' ? '#10b981' : 
                           m.status === 'partially_serviced' ? '#eab308' : 
                           '#ef4444';
              return (
                <CircleMarker
                  key={`memorial-${m.id}`}
                  center={[m.latitude, m.longitude]}
                  radius={8}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-white mb-1">📍 {m.name}</p>
                      {(m.city || m.state) && (
                        <p className="text-xs text-[#888] mb-2">
                          {[m.city, m.state].filter(Boolean).join(", ")}
                        </p>
                      )}
                      
                      <div className="space-y-1 mb-2">
                        <p className="text-xs">
                          🌸 Flower Service: {m.hasFlowerService ? '✅ Available' : '❌ Not Available'}
                        </p>
                        {m.nearestFlower && (
                          <p className="text-xs text-[#888] ml-4">
                            Nearest: {m.nearestFlower.name} ({m.nearestFlower.distance.toFixed(1)} miles)
                          </p>
                        )}
                        
                        <p className="text-xs">
                          🧹 Cleaning Service: {m.hasCleaningService ? '✅ Available' : '❌ Not Available'}
                        </p>
                        {m.nearestCleaning && (
                          <p className="text-xs text-[#888] ml-4">
                            Nearest: {m.nearestCleaning.name} ({m.nearestCleaning.distance.toFixed(1)} miles)
                          </p>
                        )}
                      </div>

                      <p className={`text-xs font-semibold ${
                        m.status === 'fully_serviced' ? 'text-[#10b981]' :
                        m.status === 'partially_serviced' ? 'text-[#eab308]' :
                        'text-[#ef4444]'
                      }`}>
                        Status: {m.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            {/* Flower Partner Markers */}
            {filteredFlowerPartners.map((fp) => (
              <CircleMarker
                key={`florist-${fp.id}`}
                center={[fp.latitude, fp.longitude]}
                radius={10}
                pathOptions={{
                  color: "#3b82f6",
                  fillColor: "#3b82f6",
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-white mb-1">🌸 {fp.name}</p>
                    <p className="text-xs text-[#3b82f6] mb-2">Flower Partner</p>
                    {(fp.city || fp.state) && (
                      <p className="text-xs text-[#888] mb-2">
                        {[fp.city, fp.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {fp.delivery_radius_miles && fp.delivery_radius_miles > 0 && (
                      <p className="text-xs text-[#888] mb-1">
                        📍 Coverage: {fp.delivery_radius_miles} mile radius
                      </p>
                    )}
                    {fp.phone && (
                      <p className="text-xs text-[#888] mb-1">📞 {fp.phone}</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}

            {/* Cleaning Partner Markers */}
            {filteredCleaningPartners.map((cp) => (
              <CircleMarker
                key={`cleaning-${cp.id}`}
                center={[cp.latitude, cp.longitude]}
                radius={10}
                pathOptions={{
                  color: "#a855f7",
                  fillColor: "#a855f7",
                  fillOpacity: 0.9,
                  weight: 3,
                }}
              >
                <Popup>
                  <div className="text-sm">
                    <p className="font-bold text-white mb-1">🧹 {cp.name}</p>
                    <p className="text-xs text-[#a855f7] mb-2">Cleaning Partner</p>
                    {(cp.city || cp.state) && (
                      <p className="text-xs text-[#888] mb-2">
                        {[cp.city, cp.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {cp.delivery_radius_miles && cp.delivery_radius_miles > 0 && (
                      <p className="text-xs text-[#888] mb-1">
                        📍 Coverage: {cp.delivery_radius_miles} mile radius
                      </p>
                    )}
                    {cp.phone && (
                      <p className="text-xs text-[#888] mb-1">📞 {cp.phone}</p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* Coverage Stats Bar */}
        <div className="absolute top-4 left-4 bg-[#111]/95 border border-[#2a2a2a] rounded-xl px-4 py-3 shadow-lg backdrop-blur-sm z-[1000]">
          <div className="flex items-center gap-3">
            <Target size={16} className="text-[#10b981]" />
            <div>
              <p className="text-xs text-[#555] uppercase tracking-wider">Coverage</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold text-white">
                  {coverageStats.fullyServiced}/{coverageStats.total}
                </span>
                <span className="text-sm text-[#10b981]">({coverageStats.percentage}%)</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className="text-[#10b981]">● {coverageStats.fullyServiced} Full</span>
                <span className="text-[#eab308]">● {coverageStats.partiallyServiced} Partial</span>
                <span className="text-[#ef4444]">● {coverageStats.unserviced} None</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Filter Buttons */}
        <div className="absolute top-4 right-4 bg-[#111]/95 border border-[#2a2a2a] rounded-xl p-3 shadow-lg backdrop-blur-sm z-[1000]">
          <p className="text-xs text-[#555] uppercase tracking-wider mb-2">Quick Filters</p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleQuickFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'all'
                  ? 'bg-[#10b981] text-white'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              Show All
            </button>
            <button
              onClick={() => handleQuickFilter('flower_gaps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'flower_gaps'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              🌸 Flower Gaps Only
            </button>
            <button
              onClick={() => handleQuickFilter('cleaning_gaps')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'cleaning_gaps'
                  ? 'bg-[#a855f7] text-white'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              🧹 Cleaning Gaps Only
            </button>
            <button
              onClick={() => handleQuickFilter('fully_unserviced')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                quickFilter === 'fully_unserviced'
                  ? 'bg-[#ef4444] text-white'
                  : 'bg-[#1a1a1a] text-[#888] hover:text-white border border-[#2a2a2a]'
              }`}
            >
              ⚠️ Fully Unserviced Only
            </button>
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

        {/* Layer Toggles */}
        <div className="p-4 border-b border-[#2a2a2a]">
          <h3 className="text-xs font-semibold text-[#555] uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin size={14} />
            Map Layers
          </h3>
          
          {/* Memorials Layer */}
          <div className="mb-3">
            <label className="flex items-center gap-2 mb-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={layerToggles.memorials.enabled}
                onChange={() => toggleLayer('memorials')}
                className="w-4 h-4 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#10b981] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-sm text-white font-medium group-hover:text-[#10b981]">Memorials</span>
            </label>
            {layerToggles.memorials.enabled && (
              <div className="ml-6 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layerToggles.memorials.fully_serviced}
                    onChange={() => toggleLayer('memorials', 'fully_serviced')}
                    className="w-3.5 h-3.5 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#10b981] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-[#888] group-hover:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981]"></span>
                    Fully Serviced
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layerToggles.memorials.partially_serviced}
                    onChange={() => toggleLayer('memorials', 'partially_serviced')}
                    className="w-3.5 h-3.5 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#eab308] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-[#888] group-hover:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#eab308]"></span>
                    Partially Serviced
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layerToggles.memorials.unserviced}
                    onChange={() => toggleLayer('memorials', 'unserviced')}
                    className="w-3.5 h-3.5 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#ef4444] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-[#888] group-hover:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                    Unserviced
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Flower Partners Layer */}
          <div className="mb-3">
            <label className="flex items-center gap-2 mb-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={layerToggles.flowerPartners.enabled}
                onChange={() => toggleLayer('flowerPartners')}
                className="w-4 h-4 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#3b82f6] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-sm text-white font-medium group-hover:text-[#3b82f6] flex items-center gap-1">
                🌸 Flower Partners
              </span>
            </label>
            {layerToggles.flowerPartners.enabled && (
              <div className="ml-6 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layerToggles.flowerPartners.active}
                    onChange={() => toggleLayer('flowerPartners', 'active')}
                    className="w-3.5 h-3.5 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#3b82f6] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-[#888] group-hover:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#3b82f6]"></span>
                    Active Partners
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Cleaning Partners Layer */}
          <div>
            <label className="flex items-center gap-2 mb-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={layerToggles.cleaningPartners.enabled}
                onChange={() => toggleLayer('cleaningPartners')}
                className="w-4 h-4 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#a855f7] focus:ring-0 focus:ring-offset-0"
              />
              <span className="text-sm text-white font-medium group-hover:text-[#a855f7] flex items-center gap-1">
                🧹 Cleaning Partners
              </span>
            </label>
            {layerToggles.cleaningPartners.enabled && (
              <div className="ml-6 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={layerToggles.cleaningPartners.active}
                    onChange={() => toggleLayer('cleaningPartners', 'active')}
                    className="w-3.5 h-3.5 rounded border-[#2a2a2a] bg-[#1a1a1a] text-[#a855f7] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-xs text-[#888] group-hover:text-white flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#a855f7]"></span>
                    Active Partners
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Partner Lists */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Memorials */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 size={14} className="text-[#10b981]" />
              <h3 className="text-xs font-semibold text-[#10b981] uppercase tracking-wider">
                Memorials ({filteredMemorials.length})
              </h3>
            </div>
            <div className="space-y-2">
              {filteredMemorials.slice(0, 20).map((m) => (
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
                      <p className="text-xs text-[#888] mt-1">
                        {m.hasFlowerService ? '🌸' : '⚪'} 
                        {' '}
                        {m.hasCleaningService ? '🧹' : '⚪'}
                      </p>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                        m.status === 'fully_serviced' ? 'bg-[#10b981]' :
                        m.status === 'partially_serviced' ? 'bg-[#eab308]' :
                        'bg-[#ef4444] animate-pulse'
                      }`}
                      title={m.status.replace(/_/g, ' ')}
                    />
                  </div>
                </button>
              ))}
              {filteredMemorials.length === 0 && (
                <p className="text-xs text-[#555] text-center py-4">No memorials match filter</p>
              )}
              {filteredMemorials.length > 20 && (
                <p className="text-xs text-[#555] text-center py-2">
                  ...and {filteredMemorials.length - 20} more
                </p>
              )}
            </div>
          </div>

          {/* Flower Partners */}
          {filteredFlowerPartners.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Flower size={14} className="text-[#3b82f6]" />
                <h3 className="text-xs font-semibold text-[#3b82f6] uppercase tracking-wider">
                  Flower Partners ({filteredFlowerPartners.length})
                </h3>
              </div>
              <div className="space-y-2">
                {filteredFlowerPartners.map((fp) => (
                  <button
                    key={fp.id}
                    onClick={() => handlePanToPartner(fp.latitude, fp.longitude)}
                    className="w-full text-left bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#3b82f6]/50 transition-all group"
                  >
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#3b82f6]">
                      {fp.name}
                    </p>
                    {(fp.city || fp.state) && (
                      <p className="text-xs text-[#555] mt-0.5">
                        {[fp.city, fp.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {fp.delivery_radius_miles && (
                      <p className="text-xs text-[#888] mt-1">
                        📍 {fp.delivery_radius_miles} mile radius
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cleaning Partners */}
          {filteredCleaningPartners.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-[#a855f7]" />
                <h3 className="text-xs font-semibold text-[#a855f7] uppercase tracking-wider">
                  Cleaning Partners ({filteredCleaningPartners.length})
                </h3>
              </div>
              <div className="space-y-2">
                {filteredCleaningPartners.map((cp) => (
                  <button
                    key={cp.id}
                    onClick={() => handlePanToPartner(cp.latitude, cp.longitude)}
                    className="w-full text-left bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-3 hover:border-[#a855f7]/50 transition-all group"
                  >
                    <p className="text-sm font-semibold text-white truncate group-hover:text-[#a855f7]">
                      {cp.name}
                    </p>
                    {(cp.city || cp.state) && (
                      <p className="text-xs text-[#555] mt-0.5">
                        {[cp.city, cp.state].filter(Boolean).join(", ")}
                      </p>
                    )}
                    {cp.delivery_radius_miles && (
                      <p className="text-xs text-[#888] mt-1">
                        📍 {cp.delivery_radius_miles} mile radius
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
