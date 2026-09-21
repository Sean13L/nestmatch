import Link from "next/link";
import { SearchForm } from "./SearchForm";

export default function HomePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-slate-900">Find your next place</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Search housing anywhere it&apos;s covered by a connected data source, then{" "}
          <Link href="/profiles/new" className="text-brand hover:underline">
            save a profile
          </Link>{" "}
          so NestMatch keeps watching for new listings that fit — and emails you the moment one shows up.
        </p>
      </div>
      <SearchForm />
    </div>
  );
}
