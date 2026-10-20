/**
 * Turkish speech on the device with EMA Lightning: no network, the model ships in assets/tts.
 * Each sentence becomes a WAV in the cache (keyed by its text) and plays while the next one is made,
 * so speech starts after the first sentence instead of the whole text.
 */
import { Asset } from 'expo-asset';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Directory, File, Paths } from 'expo-file-system';
import meta from '../assets/tts/meta.json';
import { EMA, RATE, wav, type Ort } from './engine';

const SENTENCE_GAP = 0.25; // seconds of silence after each sentence
const cacheDir = new Directory(Paths.cache, 'ema-v1');

let engine: Promise<EMA> | null = null;

/** Loads the three graphs once; a failed load is retried on the next call. */
export function loadTurkishVoice() {
  engine ??= (async () => {
    // Required here, not imported: the package installs its native binding when first loaded, and a
    // broken binding must fall back to the system voice instead of taking the app down at launch.
    const ort: Ort = require('onnxruntime-react-native');
    const [text, sound, decoder] = await Asset.loadAsync([
      require('../assets/tts/text.onnx'),
      require('../assets/tts/sound.onnx'),
      require('../assets/tts/decoder.onnx'),
    ]);
    const uri = (a: Asset) => a.localUri ?? a.uri;
    return EMA.load(ort, meta, { text: uri(text), sound: uri(sound), decoder: uri(decoder) });
  })().catch((e) => {
    engine = null;
    throw e;
  });
  return engine;
}

/** FNV-1a, enough to name cache files. */
function key(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return `${(h >>> 0).toString(36)}-${text.length}`;
}

async function render(ema: EMA, sentence: string) {
  const file = new File(cacheDir, `${key(sentence)}.wav`);
  if (file.exists) return file.uri;
  const speech = await ema.synthesize(sentence);
  const samples = new Float32Array(speech.length + Math.round(SENTENCE_GAP * RATE));
  samples.set(speech);
  file.create({ intermediates: true, overwrite: true });
  await file.write(wav(samples));
  return file.uri;
}

let player: AudioPlayer | null = null;
let finishPlaying: (() => void) | null = null;
let turn = 0;

function play(uri: string) {
  return new Promise<void>((resolve) => {
    if (!player) {
      player = createAudioPlayer(null);
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) finishPlaying?.();
      });
    }
    finishPlaying = () => {
      finishPlaying = null;
      resolve();
    };
    player.replace({ uri });
    player.play();
  });
}

export function stopTurkish() {
  turn++;
  player?.pause();
  finishPlaying?.();
}

/** Speaks `text`, cutting off whatever was playing. Rejects if the model cannot run here. */
export async function speakTurkish(text: string) {
  stopTurkish();
  const mine = turn;
  const sentences = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
  if (!sentences.length) return;
  const ema = await loadTurkishVoice();
  let next = render(ema, sentences[0]);
  for (let i = 0; i < sentences.length; i++) {
    const uri = await next;
    if (mine !== turn) return;
    if (i + 1 < sentences.length) {
      next = render(ema, sentences[i + 1]);
      next.catch(() => {}); // surfaces at the await above, unless speech was stopped first
    }
    await play(uri);
    if (mine !== turn) return;
  }
}
