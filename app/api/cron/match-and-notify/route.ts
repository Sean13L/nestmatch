import { NextRequest, NextResponse } from "next/server";
import { runMatchingForAllProfiles } from "@/lib/matching/runMatching";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Triggered by Vercel Cron (see vercel.json) on a schedule, or manually via
 * a signed request. Vercel signs cron requests with this bearer token
 * automatically; reject anything else so this endpoint can't be used to
 * spam every profile's inbox from the outside.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runMatchingForAllProfiles();
  return NextResponse.json(result);
}
