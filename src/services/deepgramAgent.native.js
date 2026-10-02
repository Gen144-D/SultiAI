/**
 * Native (Android/iOS) stub for the Deepgram live-agents bridge.
 *
 * The real implementation lives in `deepgramAgent.web.js`. The Deepgram agents
 * SDK is browser-only: it needs a Web Audio mic worklet and an `AudioContext`
 * player, and its `@deepgram/sdk` dependency pulls in Node core modules
 * (`zlib`, `stream`, ...) that Metro cannot resolve for native builds.
 *
 * Metro resolves `./deepgramAgent` to this file on Android and iOS and to
 * `deepgramAgent.web.js` on web, so the web-only SDK never enters the native
 * bundle at all.
 *
 * `VoiceModeScreen` guards every Deepgram call behind
 * `isDeepgramLiveSupported()`, which is always false here — the screen falls
 * back to the `voiceAgent` HTTP transport. The two throwing helpers exist only
 * so that a missed guard fails loudly in development instead of silently
 * handing back `undefined`.
 */

export const DEEPGRAM_INPUT_RATE = 48000;
export const DEEPGRAM_OUTPUT_RATE = 24000;

/** The Deepgram agents SDK requires a browser audio stack, so never on native. */
export function isDeepgramLiveSupported() {
  return false;
}

function unsupported() {
  throw new Error(
    'Deepgram live agents are web-only. Guard this call with isDeepgramLiveSupported().'
  );
}

export async function fetchDeepgramAgentConfig() {
  unsupported();
}

export function createDeepgramLiveSession() {
  unsupported();
}
