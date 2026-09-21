import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProfilesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <p className="text-slate-600">
        <Link href="/signin" className="text-brand hover:underline">
          Sign in
        </Link>{" "}
        to create and manage saved search profiles.
      </p>
    );
  }

  const profiles = await prisma.searchProfile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { matches: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">My profiles</h1>
        <Link href="/profiles/new" className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          New profile
        </Link>
      </div>

      {profiles.length === 0 ? (
        <p className="text-slate-500">
          No saved profiles yet. Create one to get notified automatically when a matching place shows up.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {profiles.map((profile) => (
            <Link key={profile.id} href={`/profiles/${profile.id}`} className="card block p-4 hover:shadow-md">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{profile.name}</h3>
                {!profile.active && <span className="tag bg-slate-100 text-slate-500">paused</span>}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {[profile.city, profile.region, profile.country].filter(Boolean).join(", ")} · up to{" "}
                {new Intl.NumberFormat(undefined, { style: "currency", currency: profile.currency, maximumFractionDigits: 0 }).format(
                  profile.maxPrice
                )}
              </p>
              <p className="mt-2 text-xs text-slate-400">{profile._count.matches} match(es) so far</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
