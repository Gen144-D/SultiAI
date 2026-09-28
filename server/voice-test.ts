import 'dotenv/config';
import ttsService from './src/services/ttsService';
import { groqTranscribeAudio, isGroqConfigured } from './src/utils/groq';
import { isOpenRouterConfigured, openrouterTTS } from './src/utils/openrouter';

async function main() {
  console.log('=== VOICE PIPELINE COMPONENT TESTS ===');
  console.log('GROQ configured:', isGroqConfigured());
  let openrouter = false;
  try {
    openrouter = isOpenRouterConfigured();
    console.log('OpenRouter configured:', openrouter);
  } catch (e: any) {
    console.log('OpenRouter status error:', e.message);
  }

  try {
    console.log('\n--- TTS test (Bisaya/blessica) ---');
    const result = await ttsService.synthesize('Kumusta ka? Nindot kaayo.', 'blessica', 0.9);
    console.log('TTS SUCCESS:', JSON.stringify(result));
  } catch (e: any) {
    console.log('TTS FAILED:', e.message);
  }

  try {
    console.log('\n--- OpenRouter TTS direct test ---');
    const buf = await openrouterTTS('Hello, how are you?');
    console.log('OpenRouter TTS SUCCESS, bytes:', buf.length);
  } catch (e: any) {
    console.log('OpenRouter TTS FAILED:', e.message);
  }

  try {
    console.log('\n--- Groq STT test ---');
    const sampleRate = 16000;
    const numSamples = sampleRate;
    const wav = Buffer.alloc(44 + numSamples * 2);
    wav.write('RIFF', 0);
    wav.writeUInt32LE(36 + numSamples * 2, 4);
    wav.write('WAVE', 8);
    wav.write('fmt ', 12);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36);
    wav.writeUInt32LE(numSamples * 2, 40);
    const b64 = wav.toString('base64');
    const text = await groqTranscribeAudio(b64, 'recording.wav', 'audio/wav');
    console.log('STT SUCCESS:', text);
  } catch (e: any) {
    console.log('STT FAILED:', e.message);
  }
}

main().catch(e => console.error('FATAL:', e));
