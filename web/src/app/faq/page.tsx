import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import FAQAccordion from '@/components/FAQAccordion';
import CTASection from '@/components/CTASection';

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about SultiAI.',
};

const faqs = [
  {
    question: 'What is Bisaya?',
    answer:
      "Bisaya (Cebuano) is one of the most widely spoken languages in the Philippines, native to the Visayas and much of Mindanao. It's also known as Cebuano. SultiAI teaches everyday, conversational Bisaya.",
  },
  {
    question: 'Do I need to know any Bisaya to start?',
    answer:
      "Not at all. SultiAI adapts to your level — whether you're a complete beginner or already have some exposure through family or friends.",
  },
  {
    question: 'Is SultiAI free?',
    answer:
      'Yes. The core experience — daily challenges, lessons, flashcards, and community — is free. Premium unlocks unlimited AI tutoring, voice mode, AR scenarios, and offline learning.',
  },
  {
    question: 'How does the AI tutor work?',
    answer:
      'The SULTI AI Tutor has real conversations with you in Bisaya, gently correcting your grammar and pronunciation, and adapting future lessons to the mistakes you make.',
  },
  {
    question: 'Can I practice speaking?',
    answer:
      'Absolutely. Voice Mode turns your phone into a conversation partner — you speak, the app listens, and it gives you instant pronunciation feedback.',
  },
  {
    question: "What does 'keeping Bisaya alive' mean?",
    answer:
      "Through the Living Lexicon, community members submit and verify heritage words and dialectal variations. Every learner's contribution helps document the language for future generations.",
  },
  {
    question: 'When will SultiAI be available on iOS?',
    answer:
      'SultiAI is currently on Android. An iOS version is on the roadmap once the Android experience is finalized.',
  },
];

export default function FAQ() {
  return (
    <>
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        description="Everything you need to know before you start your Bisaya journey."
      />

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <FAQAccordion items={faqs} />
      </section>

      <CTASection />
    </>
  );
}
