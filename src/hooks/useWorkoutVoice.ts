import { useState, useEffect, useCallback, useRef } from 'react';
import * as Speech from 'expo-speech';

interface WorkoutVoice {
  speak: (text: string) => void;
  stop: () => void;
  isReady: boolean;
  voiceName: string;
}

function findBestVoice(voices: Speech.Voice[]): Speech.Voice | null {
  const naturalVoiceIds = [
    'com.apple.ttsbundle.Samantha-compact',
    'com.apple.ttsbundle.Samantha-premium',
    'com.apple.voice.compact.en-US.Samantha',
    'com.apple.voice.premium.en-US.Samantha',
    'com.apple.ttsbundle.Karen-compact',
    'com.apple.ttsbundle.Daniel-compact',
    'com.apple.ttsbundle.Moira-compact',
    'com.apple.ttsbundle.Rishi-compact',
  ];

  for (const id of naturalVoiceIds) {
    const match = voices.find(v => v.identifier === id);
    if (match) return match;
  }

  const enVoices = voices.filter(v =>
    v.language?.startsWith('en') &&
    (v.name?.toLowerCase().includes('google') ||
     v.name?.toLowerCase().includes('natural') ||
     v.name?.toLowerCase().includes('high'))
  );
  if (enVoices.length > 0) return enVoices[0];

  const anyEn = voices.filter(v => v.language?.startsWith('en'));
  if (anyEn.length > 0) return anyEn[0];

  return null;
}

export function useWorkoutVoice(): WorkoutVoice {
  const [bestVoice, setBestVoice] = useState<Speech.Voice | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [voiceName, setVoiceName] = useState('Default');
  const bestVoiceRef = useRef<Speech.Voice | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const voices = await Speech.getVoicesAsync();
        if (!mounted) return;
        const selected = findBestVoice(voices);
        bestVoiceRef.current = selected;
        setBestVoice(selected);
        setVoiceName(selected?.name ?? 'Default');
      } catch {
        bestVoiceRef.current = null;
      }
      if (mounted) setIsReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  const speak = useCallback((text: string) => {
    Speech.stop();
    const voice = bestVoiceRef.current;
    Speech.speak(text, {
      language: 'en-US',
      pitch: voice ? undefined : 0.95,
      rate: 0.82,
      voice: voice?.identifier ?? undefined,
    });
  }, []);

  const stop = useCallback(() => {
    Speech.stop();
  }, []);

  return { speak, stop, isReady, voiceName };
}
