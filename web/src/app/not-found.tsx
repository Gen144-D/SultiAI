import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-4 py-28 text-center sm:px-6">
      <p className="text-6xl font-extrabold text-brand-light">404</p>
      <h1 className="mt-4 text-3xl font-extrabold text-ink">Wala nakaplagi</h1>
      <p className="mt-3 text-base text-ink-soft">That page could not be found.</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-gradient-to-r from-brand to-brand-dark px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
      >
        Back to home
      </Link>
    </section>
  );
}
