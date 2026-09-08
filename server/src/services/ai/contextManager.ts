import { getProfile, getMistakes, getFullProfileByEmail } from '../../db/repositories/learner.repo';
import { getSessionMessages } from '../../db/repositories/tutor.repo';
import { getLivingLexicon } from '../../db/repositories/preservation.repo';
import conversationMemory from './conversationMemory';
import logger from '../../utils/logger';
import { ADAPTIVE_PARAMS } from '../../config';
import type { AiContext, DifficultyParams, MistakeContext, LexiconWord } from '../../types';

export class ContextManager {
  async buildContext(userEmail: string, sessionId?: string): Promise<AiContext> {
    const startTime = Date.now();
    try {
      const profile = await getFullProfileByEmail(userEmail);

      const sessionHistory = sessionId ? await this.getSessionHistory(sessionId, userEmail) : [];

      const longTermMemory = profile
        ? await conversationMemory.getRelevantContext(profile.userId)
        : [];

      const lexiconWords = await this.getLexiconContext();
      const difficultyParams = this.calculateDifficultyParams(profile);

      const context: AiContext = {
        userLevel: profile?.level || 'beginner',
        strengths: profile?.strengths || [],
        weakAreas: profile?.weakAreas || [],
        commonMistakes: this.parseMistakes(profile?.commonMistakes),
        sessionHistory,
        longTermMemory,
        lexiconWords,
        difficultyParams,
      };

      logger.debug('Context built', {
        duration: `${Date.now() - startTime}ms`,
        level: context.userLevel,
        sessionMessages: sessionHistory.length,
        memoryEntries: longTermMemory.length,
      });

      return context;
    } catch (err) {
      logger.warn('Failed to build full context, using defaults', {
        error: (err as Error).message,
      });
      return this.getDefaultContext();
    }
  }

  async getSessionHistory(sessionId: string, userEmail: string) {
    try {
      const messages = await getSessionMessages(Number(sessionId), userEmail);
      if (!Array.isArray(messages)) return [];
      const result: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];
      for (const m of messages) {
        result.push({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content || '',
          timestamp: new Date().toISOString(),
        });
      }
      return result;
    } catch {
      return [];
    }
  }

  async getLexiconContext(): Promise<LexiconWord[]> {
    try {
      const lexicon = await getLivingLexicon(10);
      return lexicon.map((w: any) => ({
        word: w.word,
        definition: w.definition,
        dialectalRegion: w.dialectalRegion,
        bisayaExample: w.bisayaExample,
      }));
    } catch {
      return [];
    }
  }

  buildSystemPrompt(context: AiContext, mode: 'chat' | 'voice'): string {
    const parts: string[] = [];

    parts.push(`You are Sulti, a friendly and knowledgeable Bisaya (Cebuano) language tutor.`);
    parts.push(`The learner is at the ${context.userLevel} level.`);

    if (context.weakAreas.length > 0) {
      parts.push(
        `Their weak areas are: ${context.weakAreas.join(', ')}. Focus extra attention on these.`
      );
    }

    if (context.commonMistakes.length > 0) {
      const mistakeContext = context.commonMistakes
        .slice(0, 5)
        .map((m) => `- "${m.pattern}" → "${m.correction}" (${m.count}x)`)
        .join('\n');
      parts.push(`Common mistakes to proactively correct:\n${mistakeContext}`);
    }

    if (context.longTermMemory.length > 0) {
      const topTopics = context.longTermMemory
        .filter((m) => m.type === 'topic')
        .slice(0, 3)
        .map((m) => m.content);
      if (topTopics.length > 0) {
        parts.push(
          `The learner frequently practices: ${topTopics.join(', ')}. Reference these when relevant.`
        );
      }
    }

    if (context.lexiconWords.length > 0) {
      const lexiconContext = context.lexiconWords
        .slice(0, 5)
        .map((w) => `- "${w.word}"${w.definition ? ': ' + w.definition : ''}`)
        .join('\n');
      parts.push(`Preserved Bisaya words to use and teach:\n${lexiconContext}`);
    }

    const difficulty = context.difficultyParams;
    parts.push(`\nTeaching approach:\n${this.getDifficultyInstructions(difficulty)}`);

    if (mode === 'voice') {
      parts.push(
        `\nVoice mode: Keep responses concise (2-3 sentences max). Use phonetic pronunciation guides.`
      );
    }

    return parts.join('\n\n');
  }

  calculateDifficultyParams(profile: any): DifficultyParams {
    const level = profile?.level || 'beginner';

    switch (level) {
      case 'advanced':
        return {
          level: 'advanced',
          instructionDetail: 'low',
          correctionStyle: 'strict',
          vocabularyComplexity: 'complex',
          sentenceLength: 'long',
        };
      case 'intermediate':
        return {
          level: 'intermediate',
          instructionDetail: 'medium',
          correctionStyle: 'moderate',
          vocabularyComplexity: 'moderate',
          sentenceLength: 'medium',
        };
      default:
        return {
          level: 'beginner',
          instructionDetail: 'high',
          correctionStyle: 'gentle',
          vocabularyComplexity: 'simple',
          sentenceLength: 'short',
        };
    }
  }

  private getDifficultyInstructions(params: DifficultyParams): string {
    const instructions: string[] = [];

    if (params.instructionDetail === 'high') {
      instructions.push('- Teach word-by-word with clear pronunciation');
      instructions.push('- Use very simple sentences');
      instructions.push('- Repeat key vocabulary 3 times');
      instructions.push('- Always provide phonetic pronunciation guides');
    } else if (params.instructionDetail === 'medium') {
      instructions.push('- Expand to full sentences');
      instructions.push('- Introduce common slang and casual forms');
      instructions.push('- Correct grammar gently');
      instructions.push('- Ask the user to repeat and practice');
    } else {
      instructions.push('- Use natural speed conversation');
      instructions.push('- Correct nuance and regional variations');
      instructions.push('- Discuss cultural idioms and proverbs');
      instructions.push('- Challenge with complex scenarios');
    }

    return instructions.join('\n');
  }

  private parseMistakes(mistakes: any): MistakeContext[] {
    if (!mistakes) return [];
    if (Array.isArray(mistakes)) {
      return mistakes.map((m: any) => ({
        pattern: m.pattern || '',
        correction: m.correction || '',
        count: m.count || 1,
      }));
    }
    if (typeof mistakes === 'string') {
      try {
        const parsed = JSON.parse(mistakes);
        return Array.isArray(parsed) ? this.parseMistakes(parsed) : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  private getDefaultContext(): AiContext {
    return {
      userLevel: 'beginner',
      strengths: [],
      weakAreas: [],
      commonMistakes: [],
      sessionHistory: [],
      longTermMemory: [],
      lexiconWords: [],
      difficultyParams: this.calculateDifficultyParams(null),
    };
  }
}

export const contextManager = new ContextManager();
export default contextManager;
