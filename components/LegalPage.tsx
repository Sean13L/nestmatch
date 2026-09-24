export const LEGAL_EFFECTIVE_DATE = "September 24, 2026";

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-slate-700 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500">Effective {LEGAL_EFFECTIVE_DATE}</p>
      {children}
    </article>
  );
}

export function ContactLine() {
  const email = process.env.CONTACT_EMAIL;
  return email ? (
    <a href={`mailto:${email}`} className="text-brand hover:underline">
      {email}
    </a>
  ) : (
    <span>the NestMatch operator (contact address not yet published)</span>
  );
}
