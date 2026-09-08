import PlayStoreBadge from './PlayStoreBadge';

export default function CTASection() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand via-brand-dark to-ink px-6 py-16 text-center sm:px-12">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-success/20 blur-3xl" />
        <h2 className="relative mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Start speaking Bisaya today
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-base text-white/80">
          Join thousands of learners keeping Cebuano alive — one conversation at a time.
        </p>
        <div className="relative mt-8 flex justify-center">
          <PlayStoreBadge />
        </div>
        <p className="relative mt-4 text-xs text-white/60">
          Free to download · Available on Android
        </p>
      </div>
    </section>
  );
}
