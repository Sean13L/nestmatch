import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function loadOwnedProfile(id: string, userId: string) {
  const profile = await prisma.searchProfile.findUnique({ where: { id } });
  if (!profile || profile.userId !== userId) return null;
  return profile;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await loadOwnedProfile(id, session.user.id);
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const matches = await prisma.match.findMany({
    where: { profileId: profile.id },
    include: { listing: true },
    orderBy: { score: "desc" },
  });

  return NextResponse.json({ profile, matches });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedProfile(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const allowedFields = [
    "name",
    "active",
    "city",
    "region",
    "country",
    "lat",
    "lng",
    "radiusKm",
    "minPrice",
    "maxPrice",
    "currency",
    "minBedrooms",
    "minBathrooms",
    "amenities",
    "petFriendly",
    "studentFriendly",
    "minRating",
  ] as const;
  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }

  const profile = await prisma.searchProfile.update({ where: { id }, data });
  return NextResponse.json({ profile });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await loadOwnedProfile(id, session.user.id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.searchProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
