// Sound effects (Kenney CC0) + a soft generated ambient pad. Starts after the first user gesture (browser rule).
const IMP = "assets/kenney_impact-sounds/Audio/", UI = "assets/kenney_interface-sounds/Audio/", RPG = "assets/kenney_rpg-audio/Audio/";
const SFX = {
  step: [0, 1, 2, 3, 4].map(i => `${IMP}footstep_grass_00${i}.ogg`),
  jump: [`${UI}drop_002.ogg`], djump: [`${UI}drop_003.ogg`], land: [`${IMP}impactSoft_medium_000.ogg`],
  spin: [`${RPG}cloth1.ogg`, `${RPG}cloth2.ogg`], hit: [`${IMP}impactPunch_heavy_000.ogg`, `${IMP}impactPunch_heavy_001.ogg`],
  stomp: [`${IMP}impactPunch_medium_000.ogg`], wisp: [`${UI}confirmation_001.ogg`], shard: [`${UI}confirmation_004.ogg`, `${IMP}impactBell_heavy_000.ogg`],
  hurt: [`${IMP}impactPlate_heavy_000.ogg`], talk: [`${UI}select_001.ogg`], splash: [`${IMP}impactSoft_heavy_000.ogg`],
  crumble: [`${IMP}impactMining_000.ogg`, `${IMP}impactMining_001.ogg`], roar: [`${IMP}impactMetal_heavy_000.ogg`],
};
let ctx = null, master = null; const buf = {};
export async function startAudio() {
  if (ctx) return; ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
  await Promise.all(Object.values(SFX).flat().map(async u => { try { buf[u] = await ctx.decodeAudioData(await (await fetch(u)).arrayBuffer()); } catch {} }));
  ambient();
}
export function sfx(name, vol = 1, rate = 1) {
  if (!ctx) return; const list = SFX[name]; if (!list) return; const b = buf[list[Math.floor(Math.random() * list.length)]]; if (!b) return;
  const s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = rate * (0.94 + Math.random() * 0.12);
  g.gain.value = vol; s.connect(g).connect(master); s.start();
}
// eerie ambient drone for the ruined future: two detuned low oscillators through a slow filter
function ambient() {
  const g = ctx.createGain(); g.gain.value = 0.05; const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 420;
  for (const hz of [55, 82.4, 110.6]) { const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = hz; o.detune.value = Math.random() * 12 - 6; o.connect(f); o.start(); }
  const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 220; lfo.connect(lg).connect(f.frequency); lfo.start();
  f.connect(g).connect(master);
}
