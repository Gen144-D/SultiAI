import type { Metadata } from 'next';
import Link from 'next/link';
import Icon from '@/components/Icon';
import PageHero from '@/components/PageHero';
import { SITE_URL } from '@/lib/site';
import { CodeBlock, Container, GlassCard, Pill, Section, SectionHeading } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Developer API',
  description:
    'SultiAI public API: pronunciation scoring, grapheme-to-phoneme conversion and Living Lexicon lookup, authenticated with scoped API keys. Includes an MCP server for AI agents.',
  alternates: { canonical: '/api' },
};

interface Endpoint {
  method: string;
  path: string;
  scope: string;
  summary: string;
  body?: string;
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1',
    scope: 'any',
    summary: 'Self-describing index. Confirms a key works and lists its scopes.',
    response: '{ name, version, key: { name, scopes }, availableScopes, endpoints[] }',
  },
  {
    method: 'GET',
    path: '/api/v1/lexicon',
    scope: 'lexicon:read',
    summary: 'Page through the Living Lexicon of verified words and phrases.',
    response: '{ words[], count, totalApproved, limit, offset }',
  },
  {
    method: 'GET',
    path: '/api/v1/lexicon/count',
    scope: 'lexicon:read',
    summary: 'Number of approved entries in the lexicon.',
    response: '{ count }',
  },
  {
    method: 'GET',
    path: '/api/v1/lexicon/variations?word=',
    scope: 'lexicon:read',
    summary: 'Dialectal forms of a single word across regions.',
    response: '{ word, variations[] }',
  },
  {
    method: 'POST',
    path: '/api/v1/g2p',
    scope: 'g2p:read',
    summary: 'Convert Bisaya text to its phoneme sequence.',
    body: '{ "text": "Kumusta ka?", "language": "bisaya" }',
    response: '{ text, language, phonemes[], inventory[] }',
  },
  {
    method: 'GET',
    path: '/api/v1/phonemes?language=',
    scope: 'g2p:read',
    summary: 'The phoneme inventory for a language.',
    response: '{ language, phonemes[] }',
  },
  {
    method: 'POST',
    path: '/api/v1/pronunciation/score',
    scope: 'pronunciation:write',
    summary: 'Score a base64 recording against a target phrase and get a per-phoneme breakdown.',
    body: '{ "audio": "<base64>", "expected_text": "Kumusta ka?", "language": "bisaya" }',
    response: '{ expectedText, language, score, feedback, phonemeBreakdown[] }',
  },
];

const SCOPES = [
  {
    name: 'lexicon:read',
    icon: 'book' as const,
    grants: 'Living Lexicon search, counts and dialectal variations',
  },
  {
    name: 'g2p:read',
    icon: 'wave' as const,
    grants: 'Grapheme-to-phoneme conversion and inventories',
  },
  {
    name: 'pronunciation:write',
    icon: 'mic' as const,
    grants: 'Acoustic scoring of uploaded recordings',
  },
];

/** GET reads, POST writes — colour-code by verb so the list is scannable. */
const METHOD_STYLE: Record<string, string> = {
  GET: 'border-brand/25 bg-brand-light text-brand',
  POST: 'border-accent/25 bg-accent-light text-accent',
};

const MCP_TOOLS = [
  'check_pronunciation — score audio against a target phrase',
  'text_to_phonemes — grapheme to phoneme for a phrase',
  'lookup_lexicon — search the Living Lexicon',
];

export default function ApiPage() {
  return (
    <>
      <PageHero
        eyebrow="Developers"
        title="The SultiAI API"
        description="The same engine that powers the app, over plain HTTPS. Score pronunciation, convert text to phonemes, and read the Living Lexicon from your own product."
        aside={
          <CodeBlock label="first request">{`curl ${SITE_URL}/api/v1/phonemes \\
  -H "X-API-Key: $SULTIAI_KEY"

{ "language": "bisaya",
  "phonemes": ["a","b","d", "..."] }`}</CodeBlock>
        }
      />

      {/* --------------------------------------------------------------- Auth */}
      <Section>
        <Container>
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading align="left" eyebrow="Auth" title="Authentication" />
              <p className="mt-5 text-sm leading-relaxed text-ink-soft">
                Send your key in the{' '}
                <code className="rounded border border-line bg-white/5 px-1.5 py-0.5 font-mono text-xs text-brand">
                  X-API-Key
                </code>{' '}
                header. Keys are shown once at creation and stored only as a hash, so they cannot be
                recovered &mdash; only rotated.
              </p>

              <div className="mt-8 space-y-4">
                {SCOPES.map((s) => (
                  <div key={s.name} className="flex gap-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.7rem] border border-brand/20 bg-brand-light text-brand">
                      <Icon name={s.icon} className="h-4 w-4" />
                    </span>
                    <div>
                      <code className="font-mono text-xs font-semibold text-ink">{s.name}</code>
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{s.grants}</p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-8 text-sm text-ink-soft">
                Keys are issued per integration with a scope and a rate limit.{' '}
                <Link href="/faq" className="link-brand">
                  Ask for a key
                </Link>
                .
              </p>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------- Endpoints */}
      <Section className="border-y border-line">
        <Container>
          <SectionHeading eyebrow="Reference" title="Endpoints" />

          <div className="mt-12 space-y-4">
            {ENDPOINTS.map((e) => (
              <GlassCard
                as="article"
                key={`${e.method} ${e.path}`}
                level={2}
                className="p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold ${METHOD_STYLE[e.method]}`}
                  >
                    {e.method}
                  </span>
                  <code className="font-mono text-sm font-semibold text-ink">{e.path}</code>
                  {e.scope !== 'any' && (
                    <span className="ml-auto">
                      <Pill>{e.scope}</Pill>
                    </span>
                  )}
                </div>

                <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">{e.summary}</p>

                <div className="mt-4 space-y-2 border-t border-line/70 pt-4">
                  {e.body && (
                    <p className="font-mono text-[11px] leading-relaxed break-all text-ink-faint">
                      <span className="font-semibold text-ink-soft">body </span>
                      {e.body}
                    </p>
                  )}
                  <p className="font-mono text-[11px] leading-relaxed break-all text-ink-faint">
                    <span className="font-semibold text-ink-soft">returns </span>
                    {e.response}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------------------------- MCP */}
      <Section>
        <Container>
          <GlassCard level={3} sheen className="p-7 sm:p-9">
            <div className="flex flex-wrap items-start gap-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.9rem] border border-brand/25 bg-brand-light text-brand">
                <Icon name="code" className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink">MCP server</h2>
                <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
                  The same tools are exposed over the Model Context Protocol, so an AI agent can
                  score a learner&rsquo;s pronunciation or look up a word without knowing anything
                  about HTTP. It authenticates with the same key and the same scopes.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {MCP_TOOLS.map((t) => (
                    <li key={t} className="flex items-start gap-2.5">
                      <Icon
                        name="check"
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                        strokeWidth={2.5}
                      />
                      <span className="font-mono text-xs text-ink-soft">{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </GlassCard>
        </Container>
      </Section>
    </>
  );
}
