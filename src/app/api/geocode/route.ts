import { NextResponse } from "next/server";

/**
 * Reverse Geocoding API
 * Converts GPS coordinates (lat, lng) to human-readable address
 * 
 * Uses OpenStreetMap Nominatim API (free, no API key required)
 * Alternative: Can use Google Maps Geocoding API or Mapbox Geocoding API
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (!lat || !lng) {
      return NextResponse.json(
        { error: "Missing lat or lng parameters" },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        { error: "Invalid coordinates" },
        { status: 400 }
      );
    }

    // Validate coordinates are within reasonable bounds (Damascus area)
    if (
      latitude < 33.0 ||
      latitude > 34.0 ||
      longitude < 36.0 ||
      longitude > 37.0
    ) {
      return NextResponse.json(
        { error: "Coordinates outside service area" },
        { status: 400 }
      );
    }

    // Use OpenStreetMap Nominatim API for reverse geocoding
    // Free, no API key required, but has rate limits
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "We-DELIVER/1.0", // Required by Nominatim
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding service returned ${response.status}`);
    }

    const data = await response.json();

    // Extract address components
    const address = data.address || {};

    // Build address string
    const street = address.road || address.street || "";
    const neighborhood =
      address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.city_district ||
      "";
    const city = address.city || address.town || "Damascus";

    // Format the full address
    const fullAddress = [street, neighborhood, city]
      .filter(Boolean)
      .join(", ");

    return NextResponse.json({
      street: street || "Street name not available",
      neighborhood: neighborhood || "",
      city: "Damascus", // Fixed as per requirements
      fullAddress: fullAddress || "Address not available",
      raw: data, // Include raw data for debugging
    });
  } catch (error: unknown) {
    console.error("Error in geocoding API:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to geocode address", message: errorMessage },
      { status: 500 }
    );
  }
}


