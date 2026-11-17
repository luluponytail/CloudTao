import { useEffect, useRef } from 'react';

/** Lightweight procedural wind-and-water ambience; no external audio asset required. */
export function useAmbience(enabled: boolean) {
  const audio = useRef<{ context: AudioContext; gain: GainNode } | undefined>(undefined);

  useEffect(() => {
    if (!enabled) {
      audio.current?.gain.gain.setTargetAtTime(0, audio.current.context.currentTime, 0.2);
      return;
    }
    if (!audio.current) {
      const context = new AudioContext();
      const length = context.sampleRate * 3;
      const buffer = context.createBuffer(1, length, context.sampleRate);
      const channel = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) {
        last = last * 0.985 + (Math.random() * 2 - 1) * 0.015;
        channel[i] = last;
      }
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 820;
      const gain = context.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
      audio.current = { context, gain };
    }
    void audio.current.context.resume();
    audio.current.gain.gain.setTargetAtTime(0.14, audio.current.context.currentTime, 0.5);
    return () => {
      if (audio.current) audio.current.gain.gain.setTargetAtTime(0, audio.current.context.currentTime, 0.2);
    };
  }, [enabled]);
}
