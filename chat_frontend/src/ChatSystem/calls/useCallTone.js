import { useEffect } from "react";

let sharedContext;

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedContext ||= new AudioContextClass();
  return sharedContext;
};

const playNote = (
  context,
  frequency,
  startOffset,
  duration,
  gainValue = 0.055,
) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + startOffset;
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
};

const playPattern = (context, mode) => {
  if (mode === "incoming") {
    playNote(context, 659.25, 0, 0.22);
    playNote(context, 783.99, 0.26, 0.22);
    playNote(context, 987.77, 0.52, 0.34);
    return;
  }
  playNote(context, 440, 0, 0.35, 0.04);
  playNote(context, 523.25, 0.4, 0.35, 0.04);
};

// Browsers permit incoming audio after the user has interacted with the page.
export function useCallTone(mode) {
  useEffect(() => {
    const unlock = () => {
      getAudioContext()
        ?.resume()
        .catch(() => {});
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!mode) return undefined;
    const context = getAudioContext();
    if (!context) return undefined;
    let stopped = false;
    const play = async () => {
      await context.resume().catch(() => {});
      if (!stopped && context.state === "running") playPattern(context, mode);
    };
    play();
    const interval = window.setInterval(
      play,
      mode === "incoming" ? 2400 : 3000,
    );
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [mode]);
}
