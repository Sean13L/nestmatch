import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/ListingCard";
import { ProfileActions } from "./ProfileActions";

export default async function ProfileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return <p className="text-slate-600">Sign in to view this profile.</p>;
  }

  const profile = await prisma.searchProfile.findUnique({ where: { id } });
  if (!profile || profile.userId !== session.user.id) notFound();

  const matches = await prisma.match.findMany({
    where: { profileId: profile.id },
    include: { listing: true },
    orderBy: { score: "desc" },
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{profile.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {[profile.city, profile.region, profile.country].filter(Boolean).join(", ")} · within {profile.radiusKm}km · up to{" "}
            {new Intl.NumberFormat(undefined, { style: "currency", currency: profile.currency, maximumFractionDigits: 0 }).format(
              profile.maxPrice
            )}
          </p>
          {profile.amenities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {profile.amenities.map((a) => (
                <span key={a} className="tag">
                  {a.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
        <ProfileActions profileId={profile.id} active={profile.active} />
      </div>

      <h2 className="mb-3 text-lg font-medium text-slate-900">Matches ({matches.length})</h2>
      {matches.length === 0 ? (
        <p className="text-slate-500">
          No matches yet. The matching job checks providers regularly — check back soon, or run a manual search on
          the homepage in the meantime.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <ListingCard key={m.id} listing={m.listing} score={m.score} />
          ))}
        </div>
      )}
    </div>
  );
}
