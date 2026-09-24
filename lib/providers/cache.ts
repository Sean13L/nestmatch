import { prisma } from "@/lib/prisma";

export async function getCachedResponse<T>(
  provider: string,
  queryKey: string
): Promise<{ data: T; fetchedAt: Date } | null> {
  const row = await prisma.providerCache.findUnique({
    where: { provider_queryKey: { provider, queryKey } },
  });
  return row ? { data: row.data as T, fetchedAt: row.fetchedAt } : null;
}

export async function setCachedResponse(provider: string, queryKey: string, data: unknown): Promise<void> {
  const json = data as object;
  await prisma.providerCache.upsert({
    where: { provider_queryKey: { provider, queryKey } },
    create: { provider, queryKey, data: json },
    update: { data: json, fetchedAt: new Date() },
  });
}

export function isFresh(fetchedAt: Date, maxAgeMs: number): boolean {
  return Date.now() - fetchedAt.getTime() < maxAgeMs;
}

/**
 * Atomically claims one request from this month's budget. Returns false
 * (without incrementing) once `limit` is reached, so concurrent searches
 * and the cron can't overshoot a free tier between check and call.
 */
export async function reserveMonthlyRequest(provider: string, limit: number): Promise<boolean> {
  if (limit <= 0) return false;
  const month = new Date().toISOString().slice(0, 7);
  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "ProviderUsage" ("provider", "month", "count")
    VALUES (${provider}, ${month}, 1)
    ON CONFLICT ("provider", "month")
    DO UPDATE SET "count" = "ProviderUsage"."count" + 1
    WHERE "ProviderUsage"."count" < ${limit}
    RETURNING "count"`;
  return rows.length > 0;
}

export function envInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
