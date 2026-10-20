/**
 * Read text aloud. Inside the mobile app the page runs in a WebView, whose
 * speech support is unreliable, so the text is handed to the app (expo-speech);
 * in a browser the Web Speech API is used.
 */
type Bridge = { postMessage(message: string): void };

const bridge = (): Bridge | undefined => (window as unknown as { ReactNativeWebView?: Bridge }).ReactNativeWebView;

export function speak(text: string, lang: 'tr' | 'en') {
  const language = lang === 'tr' ? 'tr-TR' : 'en-US';
  const app = bridge();
  if (app) return app.postMessage(JSON.stringify({ type: 'speak', text, language }));
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = language;
    u.rate = 0.92;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  } catch {
    /* no speech available */
  }
}

export function stopSpeaking() {
  const app = bridge();
  if (app) return app.postMessage(JSON.stringify({ type: 'stopSpeaking' }));
  try {
    speechSynthesis.cancel();
  } catch {
    /* no speech available */
  }
}
