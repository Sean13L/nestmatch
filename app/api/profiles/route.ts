import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().min(1),
  city: z.string().optional(),
  region: z.string().optional(),
  country: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radiusKm: z.number().min(0.5).max(200).default(10),
  minPrice: z.number().optional(),
  maxPrice: z.number().min(1),
  currency: z.string().default("USD"),
  minBedrooms: z.number().optional(),
  minBathrooms: z.number().optional(),
  moveInEarliest: z.string().optional(),
  moveInLatest: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  petFriendly: z.boolean().default(false),
  studentFriendly: z.boolean().default(false),
  minRating: z.number().min(0).max(5).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profiles = await prisma.searchProfile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });
  return NextResponse.json({ profiles });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const profile = await prisma.searchProfile.create({
    data: {
      userId: session.user.id,
      name: data.name,
      city: data.city,
      region: data.region,
      country: data.country,
      lat: data.lat,
      lng: data.lng,
      radiusKm: data.radiusKm,
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      currency: data.currency,
      minBedrooms: data.minBedrooms,
      minBathrooms: data.minBathrooms,
      moveInEarliest: data.moveInEarliest ? new Date(data.moveInEarliest) : undefined,
      moveInLatest: data.moveInLatest ? new Date(data.moveInLatest) : undefined,
      amenities: data.amenities,
      petFriendly: data.petFriendly,
      studentFriendly: data.studentFriendly,
      minRating: data.minRating,
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}
