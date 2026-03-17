import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function expandDirectionals(str: string): string {
  return str
    .replace(/\bN\b/gi, "North")
    .replace(/\bS\b/gi, "South")
    .replace(/\bE\b/gi, "East")
    .replace(/\bW\b/gi, "West")
    .replace(/\bNE\b/gi, "Northeast")
    .replace(/\bNW\b/gi, "Northwest")
    .replace(/\bSE\b/gi, "Southeast")
    .replace(/\bSW\b/gi, "Southwest");
}

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  const query = encodeURIComponent(address);
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
  
  const res = await fetch(url, {
    headers: { "User-Agent": "Pontis Mission Control (contact: joe@pontis.life)" },
  });
  
  if (!res.ok) return null;
  
  const data = await res.json();
  if (!data || data.length === 0) return null;
  
  return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch partner
    const { data: partner, error: fetchError } = await supabase
      .from("crm_partners")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !partner) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    // Build address components
    const { address, city, state, zip } = partner;
    if (!address && !city && !state) {
      return NextResponse.json({ error: "No address data to geocode" }, { status: 400 });
    }

    // Progressive fallback geocoding strategy
    let coords: { lat: number; lon: number } | null = null;

    // Attempt 1: Full address
    if (address && city && state) {
      const fullAddr = `${address}, ${city}, ${state}${zip ? " " + zip : ""}`;
      coords = await geocodeAddress(fullAddr);
    }

    // Attempt 2: Expanded directionals (e.g., "S Main" → "South Main")
    if (!coords && address && city && state) {
      const expanded = expandDirectionals(`${address}, ${city}, ${state}${zip ? " " + zip : ""}`);
      coords = await geocodeAddress(expanded);
    }

    // Attempt 3: Street only (no city/state)
    if (!coords && address) {
      coords = await geocodeAddress(address);
    }

    // Attempt 4: City + State only
    if (!coords && city && state) {
      coords = await geocodeAddress(`${city}, ${state}`);
    }

    if (!coords) {
      return NextResponse.json({ error: "Geocoding failed for all attempts" }, { status: 404 });
    }

    // Update partner with coordinates
    const { data: updated, error: updateError } = await supabase
      .from("crm_partners")
      .update({ latitude: coords.lat, longitude: coords.lon })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      partner: updated,
      coords,
    });
  } catch (err: any) {
    console.error("Geocode error:", err);
    return NextResponse.json({ error: err.message || "Unknown error" }, { status: 500 });
  }
}
