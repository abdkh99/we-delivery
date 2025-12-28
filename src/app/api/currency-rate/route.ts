// src/app/api/currency-rate/route.ts
// API لجلب سعر الصرف الحالي

import { NextResponse } from "next/server";
import { ensureUsdToSypRate } from "@/lib/currency";

export async function GET() {
  try {
    const rateInfo = await ensureUsdToSypRate();

    return NextResponse.json({
      rate: rateInfo.rate,
      provider: rateInfo.provider,
      fetchedAt: rateInfo.fetchedAt,
      source: rateInfo.source,
    });
  } catch (error) {
    console.error("Error fetching rate:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate" },
      { status: 500 }
    );
  }
}
