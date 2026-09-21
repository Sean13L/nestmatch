import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNeighborhoodInsights } from "@/lib/neighborhood/googlePlaces";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.lat == null || listing.lng == null) {
    return NextResponse.json({});
  }

  const insights = await getNeighborhoodInsights(listing.lat, listing.lng);
  return NextResponse.json(insights);
}
