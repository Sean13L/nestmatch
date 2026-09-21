import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/ListingCard";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return (
      <p className="text-slate-600">
        <Link href="/signin" className="text-brand hover:underline">
          Sign in
        </Link>{" "}
        to see your matches.
      </p>
    );
  }

  const matches = await prisma.match.findMany({
    where: { profile: { userId: session.user.id } },
    include: { listing: true, profile: true },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">All matches</h1>
      {matches.length === 0 ? (
        <p className="text-slate-500">
          Nothing yet.{" "}
          <Link href="/profiles/new" className="text-brand hover:underline">
            Create a search profile
          </Link>{" "}
          and matches will start showing up here as new listings come in.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {matches.map((m) => (
            <div key={m.id}>
              <p className="mb-1 text-xs text-slate-400">from &ldquo;{m.profile.name}&rdquo;</p>
              <ListingCard listing={m.listing} score={m.score} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
