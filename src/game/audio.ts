// Synthesized sound effects and music via Web Audio (no external files).
let ctx: AudioContext | null = null;
let master: GainNode, music: GainNode, fx: GainNode;
const vol = { music: 0.7, sfx: 0.8 };
let timer: ReturnType<typeof setInterval> | null = null;
let stepIdx = 0;

export function initAudio(muted: boolean) {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain(); master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0.2 * vol.music; music.connect(master);
    fx = ctx.createGain(); fx.gain.value = vol.sfx; fx.connect(master);
  }
  master.gain.value = muted ? 0 : 0.7;
  void ctx.resume();
}
export function setMuted(m: boolean) { if (master) master.gain.value = m ? 0 : 0.7; }
export function setVolumes(m: number, s: number) {
  vol.music = m; vol.sfx = s;
  if (music) music.gain.value = 0.2 * m;
  if (fx) fx.gain.value = s;
}

function tone(f: number, dur: number, type: OscillatorType, vol: number, to?: number, delay = 0, dest?: AudioNode) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(dest ?? fx); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur: number, vol: number) {
  if (!ctx) return;
  const b = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = ctx.createBufferSource(), g = ctx.createGain();
  s.buffer = b; g.gain.value = vol; s.connect(g); g.connect(fx); s.start();
}

export const sfx = {
  coin: () => { tone(988, 0.07, "square", 0.08); tone(1480, 0.14, "square", 0.08, undefined, 0.06); },
  jump: () => tone(260, 0.2, "triangle", 0.25, 720),
  slide: () => tone(600, 0.22, "sawtooth", 0.08, 140),
  lane: () => tone(420, 0.05, "sine", 0.12, 520),
  crash: () => { noise(0.5, 0.5); tone(160, 0.5, "sawtooth", 0.25, 40); },
  click: () => tone(720, 0.05, "square", 0.06),
  reward: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, "triangle", 0.15, undefined, i * 0.09)),
};

const BASS = [55, 55, 65.4, 49];
const ARP = [0, 3, 7, 10, 12, 10, 7, 3];
export function startMusic() {
  if (!ctx || timer) return;
  timer = setInterval(() => {
    const bar = Math.floor(stepIdx / 16) % 4, s = stepIdx % 16, root = BASS[bar]!;
    if (s % 2 === 0) tone(root, 0.18, "sawtooth", 0.5, undefined, 0, music);
    const n = root * 4 * Math.pow(2, ARP[s % 8]! / 12);
    tone(n, 0.1, "square", 0.18, undefined, 0, music);
    if (s % 4 === 0) tone(140, 0.12, "sine", 0.9, 45, 0, music);
    stepIdx++;
  }, 120);
}
export function stopMusic() { if (timer) clearInterval(timer); timer = null; }
