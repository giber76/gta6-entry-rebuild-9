// Solara Bay — radio and sound effects, generated with WebAudio (no audio files).
// Three stations, each a 16-step loop (bass + lead + hats). Everything is
// defensive: if the browser blocks audio, the game keeps running silently.

export const STATIONS = ['SOLARA FM', 'BAY 97.5', 'VICE 101'];

// 16-step patterns per station: bass notes (semitone offsets from A2),
// lead notes (offsets from A4), hat steps (1 = hit). Tempo in steps/second.
const PATTERNS = [
  { bpm: 112, bass: [0, 0, 7, 0, 10, 0, 7, 5, 0, 0, 7, 0, 12, 10, 7, 5], lead: [12, 0, 15, 19, 0, 15, 12, 0, 19, 0, 15, 12, 0, 19, 24, 0], hats: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1] },
  { bpm: 96, bass: [0, 0, 0, 3, 0, 5, 0, 3, 0, 0, 0, 3, 7, 5, 3, 0], lead: [12, 12, 0, 15, 0, 0, 19, 0, 17, 15, 0, 12, 0, 0, 15, 0], hats: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1] },
  { bpm: 128, bass: [0, 7, 0, 7, 10, 7, 0, 5, 0, 7, 0, 7, 12, 7, 10, 7], lead: [24, 0, 19, 0, 22, 0, 19, 0, 24, 0, 19, 22, 0, 19, 0, 12], hats: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1] },
];

function noteFreq(semi, base) {
  return base * Math.pow(2, semi / 12);
}

export function createAudio() {
  const A = {
    ctx: null,
    master: null,
    noiseBuf: null,
    station: 2, // starts on VICE 101 so one R press lands on SOLARA FM
    step: 0,
    nextStepTime: 0,
    engineOsc: null,
    engineGain: null,
    enabled: false,
  };

  A.init = function () {
    if (A.ctx) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      A.ctx = new Ctx();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.35;
      A.master.connect(A.ctx.destination);
      const len = A.ctx.sampleRate * 1;
      A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const data = A.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      A.enabled = true;
      A.nextStepTime = A.ctx.currentTime + 0.1;
      // Low engine hum, pitch follows speed (updated in update()).
      A.engineOsc = A.ctx.createOscillator();
      A.engineOsc.type = 'sawtooth';
      A.engineOsc.frequency.value = 55;
      A.engineGain = A.ctx.createGain();
      A.engineGain.gain.value = 0.0;
      const filt = A.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 320;
      A.engineOsc.connect(filt);
      filt.connect(A.engineGain);
      A.engineGain.connect(A.master);
      A.engineOsc.start();
    } catch (e) {
      A.enabled = false;
    }
  };

  A.resume = function () {
    if (A.ctx && A.ctx.state === 'suspended') {
      A.ctx.resume().catch(() => {});
    }
  };

  function tone(freq, t0, dur, type, vol, dest) {
    if (!A.enabled) return;
    try {
      const o = A.ctx.createOscillator();
      const g = A.ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(dest || A.master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) { /* silent */ }
  }

  function hat(t0, vol) {
    if (!A.enabled) return;
    try {
      const s = A.ctx.createBufferSource();
      s.buffer = A.noiseBuf;
      const f = A.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = 7000;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
      s.connect(f);
      f.connect(g);
      g.connect(A.master);
      s.start(t0, Math.random());
      s.stop(t0 + 0.08);
    } catch (e) { /* silent */ }
  }

  A.update = function (dt, speedKmh, inCar) {
    if (!A.enabled || !A.ctx) return;
    try {
      if (A.engineGain) {
        A.engineGain.gain.value = inCar ? 0.02 + (speedKmh / 140) * 0.05 : 0.0;
        if (A.engineOsc) A.engineOsc.frequency.value = 50 + speedKmh * 1.1;
      }
      const pat = PATTERNS[A.station];
      const stepDur = 60 / pat.bpm / 4;
      while (A.nextStepTime < A.ctx.currentTime + 0.15) {
        const s = A.step % 16;
        const t = A.nextStepTime;
        const b = pat.bass[s];
        if (b !== undefined && b !== null) tone(noteFreq(b, 110), t, stepDur * 1.8, 'triangle', 0.5);
        const l = pat.lead[s];
        if (l) tone(noteFreq(l, 440), t, stepDur * 0.9, 'square', 0.08);
        if (pat.hats[s]) hat(t, 0.12);
        A.step++;
        A.nextStepTime += stepDur;
      }
    } catch (e) { /* silent */ }
  };

  A.cycleStation = function () {
    A.station = (A.station + 1) % STATIONS.length;
    return STATIONS[A.station];
  };

  A.stationName = function () {
    return STATIONS[A.station];
  };

  A.playShoot = function () {
    if (!A.enabled) return;
    try {
      const t = A.ctx.currentTime;
      const s = A.ctx.createBufferSource();
      s.buffer = A.noiseBuf;
      const f = A.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0.6, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      s.connect(f);
      f.connect(g);
      g.connect(A.master);
      s.start(t, Math.random() * 0.5);
      s.stop(t + 0.15);
      tone(220, t, 0.08, 'square', 0.15);
    } catch (e) { /* silent */ }
  };

  A.playExplosion = function () {
    if (!A.enabled) return;
    try {
      const t = A.ctx.currentTime;
      const s = A.ctx.createBufferSource();
      s.buffer = A.noiseBuf;
      const f = A.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      s.connect(f);
      f.connect(g);
      g.connect(A.master);
      s.start(t);
      s.stop(t + 1.0);
      tone(55, t, 0.8, 'sine', 0.7);
    } catch (e) { /* silent */ }
  };

  A.playClick = function () {
    if (!A.enabled) return;
    tone(660, A.ctx.currentTime, 0.05, 'square', 0.08);
  };

  A.playBusted = function () {
    if (!A.enabled) return;
    const t = A.ctx.currentTime;
    tone(392, t, 0.25, 'square', 0.12);
    tone(311, t + 0.25, 0.25, 'square', 0.12);
    tone(233, t + 0.5, 0.5, 'square', 0.12);
  };

  return A;
}
