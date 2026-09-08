export default function PageHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="bg-gradient-to-b from-brand-light to-white">
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
            {description}
          </p>
        )}
      </div>
    </section>
  );
}
