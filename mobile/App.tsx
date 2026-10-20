import * as Speech from 'expo-speech';
import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import gameHtml from './game/html';
import { loadTurkishVoice, speakTurkish, stopTurkish } from './tts/speaker';

type GameMessage = { type: 'speak'; text: string; language: string } | { type: 'stopSpeaking' };

function systemSpeak(text: string, language: string) {
  Speech.speak(text, { language, rate: 0.92, pitch: 1.05 });
}

/**
 * The game asks the app to read level intros aloud: WebView speech is unreliable on Android.
 * Turkish uses the on-device EMA Lightning voice; English, or a device where it fails, the system voice.
 */
function onGameMessage(event: WebViewMessageEvent) {
  let msg: GameMessage;
  try {
    msg = JSON.parse(event.nativeEvent.data);
  } catch {
    return;
  }
  void Speech.stop();
  stopTurkish();
  if (msg.type !== 'speak') return;
  if (msg.language.startsWith('tr')) speakTurkish(msg.text).catch(() => systemSpeak(msg.text, msg.language));
  else systemSpeak(msg.text, msg.language);
}

/**
 * The whole game is the bundled web build (Three.js) running offline in a
 * full-screen WebView. A fixed https base URL gives it an origin, so its
 * localStorage progress persists between launches.
 */
export default function App() {
  // Load the voice while the map shows, so the first level intro speaks without a wait.
  useEffect(() => {
    loadTurkishVoice().catch(() => {});
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <NavigationBar hidden />
      <WebView
        style={styles.web}
        originWhitelist={['*']}
        source={{ html: gameHtml, baseUrl: 'https://matematik-labirenti.app/' }}
        onMessage={onGameMessage}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        textZoom={100}
        overScrollMode="never"
        bounces={false}
        setBuiltInZoomControls={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#7fd3ff' },
  web: { flex: 1, backgroundColor: '#7fd3ff' },
});
