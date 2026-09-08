export default function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-3xl border border-line bg-white p-6 transition-all hover:-translate-y-1 hover:border-brand/30 hover:shadow-lg">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-2xl">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{description}</p>
    </div>
  );
}
