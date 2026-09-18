import { isConfigured, groqChat, groqTranscribeAudio, groqJson } from '../../utils/groq';
import contextManager from './contextManager';
import conversationMemory from './conversationMemory';
import logger from '../../utils/logger';
import type { PipelineInput, PipelineOutput, AiAnalysis, PronunciationResult } from '../../types';

export class AiPipeline {
  async process(input: PipelineInput, userEmail: string): Promise<PipelineOutput> {
    const startTime = Date.now();

    if (!isConfigured()) {
      throw new Error('AI service not configured');
    }

    try {
      let text = input.message || '';
      let transcription: string | null = null;
      let pronunciation: PronunciationResult | undefined;

      if (input.audio) {
        const transcriptionStart = Date.now();
        let filename = 'recording.webm';
        let mimeType = 'audio/webm';
        if (input.audio.startsWith('Ukl')) { filename = 'recording.wav'; mimeType = 'audio/wav'; }
        else if (input.audio.startsWith('SUk')) { filename = 'recording.wav'; mimeType = 'audio/wav'; }
        text = await groqTranscribeAudio(input.audio, filename, mimeType);
        transcription = text;
        logger.ai('whisper', 'transcribe', Date.now() - transcriptionStart, true);
      }

      if (!text) {
        throw new Error('Could not transcribe audio and no text provided');
      }

      const context = await contextManager.buildContext(userEmail, input.session_id);
      const systemPrompt = contextManager.buildSystemPrompt(
        context,
        input.audio ? 'voice' : 'chat'
      );

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...context.sessionHistory.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: text },
      ];

      const chatStart = Date.now();
      const reply = await groqChat(messages, { temperature: 0.8, maxTokens: 1000 });
      logger.ai('groq', 'chat', Date.now() - chatStart, true);

      const analysis = this.extractAnalysis(reply);
      const cleanReply = this.stripAnalysisTag(reply);

      if (input.audio && transcription) {
        pronunciation = await this.assessPronunciation(transcription);
      }

      const recommendations = await this.generateRecommendations(context, analysis);

      logger.ai('pipeline', 'full_process', Date.now() - startTime, true);

      return {
        reply: cleanReply,
        sessionId: input.session_id || '',
        transcription: transcription || undefined,
        pronunciation,
        analysis,
        recommendations,
      };
    } catch (err) {
      logger.ai('pipeline', 'full_process', Date.now() - startTime, false);
      throw err;
    }
  }

  async generateLesson(situation: string, userEmail: string): Promise<Record<string, unknown>> {
    const startTime = Date.now();

    if (!isConfigured()) {
      throw new Error('AI service not configured');
    }

    const context = await contextManager.buildContext(userEmail);
    const levelHint = `The learner is at ${context.userLevel} level.`;

    const systemPrompt = `You are a Bisaya (Cebuano) language lesson creator. Create a short interactive lesson for the given situation. ${levelHint}
Return ONLY a valid JSON object (no other text) with this structure:
{
  "situation": "string",
  "text": "short intro paragraph",
  "phrases": [{ "bisaya": "...", "english": "...", "pronunciation": "..." }],
  "dialogue": [{ "speaker": "...", "bisaya": "...", "english": "..." }],
  "cultural_note": "relevant cultural context",
  "practice_suggestions": ["tip 1", "tip 2"]
}`;

    try {
      const lesson = await groqJson<Record<string, unknown>>(
        systemPrompt,
        `Create a lesson for: ${situation}`,
        { temperature: 0.7, maxTokens: 1200 }
      );
      logger.ai('groq', 'lesson_generate', Date.now() - startTime, true);
      return lesson;
    } catch (err) {
      logger.ai('groq', 'lesson_generate', Date.now() - startTime, false);
      throw err;
    }
  }

  private async assessPronunciation(text: string): Promise<PronunciationResult | undefined> {
    const startTime = Date.now();
    const systemPrompt = `You are a Bisaya pronunciation coach. Analyze the given text.
Return ONLY a valid JSON object with: "score" (0-100), "feedback" (string), "phoneme_breakdown" (array of {expected, heard, correct, tip}).`;

    try {
      const result = await groqJson<PronunciationResult>(
        systemPrompt,
        `Analyze pronunciation for this Bisaya text: "${text}"`,
        { temperature: 0.3, maxTokens: 500 }
      );
      logger.ai('groq', 'pronunciation', Date.now() - startTime, true);
      return result;
    } catch {
      logger.ai('groq', 'pronunciation', Date.now() - startTime, false);
      return undefined;
    }
  }

  private async generateRecommendations(context: any, analysis: AiAnalysis): Promise<string[]> {
    if (analysis.topics.length === 0) return [];
    return analysis.topics.slice(0, 3);
  }

  private extractAnalysis(reply: string): AiAnalysis {
    const defaultAnalysis: AiAnalysis = {
      detectedMistakes: [],
      topics: [],
      userLevel: 'beginner',
    };

    const match = reply.match(/__ANALYSIS__(\{.*?\})__END__/);
    if (!match) return defaultAnalysis;

    try {
      const parsed = JSON.parse(match[1]);
      return {
        detectedMistakes: parsed.detected_mistakes || [],
        topics: parsed.topics || [],
        userLevel: parsed.user_level || 'beginner',
        intent: parsed.intent,
        emotion: parsed.emotion,
      };
    } catch {
      return defaultAnalysis;
    }
  }

  private stripAnalysisTag(reply: string): string {
    return reply.replace(/__ANALYSIS__\{.*?\}__END__/, '').trim();
  }
}

export const aiPipeline = new AiPipeline();
export default aiPipeline;
