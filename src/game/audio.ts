const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'square',
  volume = 0.08,
  slide = 0,
  delay = 0,
) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
  if (slide) {
    osc.frequency.linearRampToValueAtTime(
      freq + slide,
      audioCtx.currentTime + delay + duration,
    );
  }
  gain.gain.setValueAtTime(volume, audioCtx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    audioCtx.currentTime + delay + duration,
  );
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + delay);
  osc.stop(audioCtx.currentTime + delay + duration);
}

function playNoise(duration: number, volume = 0.04) {
  const buf = audioCtx.createBuffer(1, audioCtx.sampleRate * duration, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 2000;
  src.buffer = buf;
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(audioCtx.destination);
  src.start();
}

export function sfxJump() {
  playTone(400, 0.08, 'square', 0.06);
  setTimeout(() => playTone(600, 0.1, 'square', 0.06), 30);
  setTimeout(() => playTone(900, 0.12, 'square', 0.05), 60);
}

export function sfxCoin() {
  playTone(988, 0.05, 'square', 0.06);
  setTimeout(() => playTone(1319, 0.15, 'square', 0.06), 50);
}

export function sfxBlockHit() {
  playTone(300, 0.06, 'square', 0.06);
  setTimeout(() => playTone(500, 0.06, 'square', 0.04), 40);
}

export function sfxBump() {
  playTone(150, 0.08, 'triangle', 0.08);
}

export function sfxStomp() {
  playTone(400, 0.04, 'square', 0.06);
  setTimeout(() => playTone(250, 0.1, 'square', 0.05), 20);
}

export function sfxDeath() {
  playTone(400, 0.15, 'square', 0.07, -200, 0);
  setTimeout(() => playTone(300, 0.15, 'square', 0.07, -150, 150), 0);
  setTimeout(() => playTone(200, 0.3, 'square', 0.06, -100, 300), 0);
}

export function sfxWin() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((n, i) => {
    playTone(n, 0.15, 'square', 0.06, 0, i * 0.12);
  });
  playTone(1047, 0.4, 'square', 0.06, 0, notes.length * 0.12);
}

export function sfxPowerUp() {
  const notes = [400, 500, 600, 700, 800, 900, 1000];
  notes.forEach((n, i) => {
    playTone(n, 0.06, 'square', 0.05, 0, i * 0.04);
  });
}

export function sfxDialog() {
  playTone(800, 0.03, 'square', 0.03);
  setTimeout(() => playTone(700, 0.03, 'square', 0.03), 30);
  setTimeout(() => playTone(600, 0.03, 'square', 0.03), 60);
}

export function resumeAudio() {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
