import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getNeighborhoodInsights, NEIGHBORHOOD_CATEGORIES } from "@/lib/neighborhood/googlePlaces";

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) notFound();

  const insights =
    listing.lat != null && listing.lng != null ? await getNeighborhoodInsights(listing.lat, listing.lng) : {};
  const hasInsights = Object.keys(insights).length > 0;

  const price = new Intl.NumberFormat(undefined, { style: "currency", currency: listing.currency, maximumFractionDigits: 0 }).format(
    listing.price
  );

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-semibold text-slate-900">{listing.title}</h1>
        <p className="mt-1 text-slate-500">
          {[listing.addressLine, listing.city, listing.region, listing.country].filter(Boolean).join(", ")}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-xl font-semibold text-slate-900">
            {price}
            <span className="text-sm font-normal text-slate-500">/{listing.priceInterval}</span>
          </span>
          {listing.bedrooms != null && <span className="text-slate-600">{listing.bedrooms} bd</span>}
          {listing.bathrooms != null && <span className="text-slate-600">{listing.bathrooms} ba</span>}
          {listing.rating != null && (
            <span className="text-slate-600">
              ★ {listing.rating.toFixed(1)} {listing.reviewCount ? `· ${listing.reviewCount} reviews` : ""}
            </span>
          )}
          {listing.availableFrom && (
            <span className="text-slate-600">
              Available {new Date(listing.availableFrom).toLocaleDateString()}
            </span>
          )}
        </div>

        {listing.amenities.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {listing.amenities.map((a) => (
              <span key={a} className="tag">
                {a.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}

        {listing.description && <p className="mt-6 whitespace-pre-line text-slate-700">{listing.description}</p>}

        <a
          href={listing.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-block rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
        >
          View original listing ({listing.source}) →
        </a>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium text-slate-900">Neighborhood</h2>
        {!hasInsights ? (
          <p className="text-sm text-slate-500">
            Neighborhood data isn&apos;t available for this listing yet — either it has no location on file, or
            GOOGLE_PLACES_API_KEY isn&apos;t configured.
          </p>
        ) : (
          <div className="space-y-4">
            {NEIGHBORHOOD_CATEGORIES.map((category) => {
              const places = insights[category.key];
              if (!places || places.length === 0) return null;
              return (
                <div key={category.key} className="card p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">{category.label}</h3>
                  <ul className="space-y-1.5 text-sm text-slate-600">
                    {places.map((place, i) => (
                      <li key={i} className="flex items-center justify-between gap-2">
                        <span>{place.name}</span>
                        {place.rating != null && (
                          <span className="shrink-0 text-xs text-slate-400">★ {place.rating.toFixed(1)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
