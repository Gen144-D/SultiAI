export default function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-brand">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description && <p className="mt-4 text-base leading-relaxed text-ink-soft">{description}</p>}
    </div>
  );
}
