#!/usr/bin/env node
/**
 * Generates a 5-minute UPBEAT ambient background track for the PCP explainer video.
 * Outputs a WAV file: public/music/ambient-bg.wav
 *
 * Uses a major key (C major) with rhythmic pulse, bright harmonics,
 * and energetic modulation. Royalty-free (generated from math).
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Audio params ───────────────────────────────────────────────
const SAMPLE_RATE = 22050;
const DURATION    = 300;     // 5 minutes
const BIT_DEPTH   = 16;
const CHANNELS    = 1;

// ── Major key harmonic layers (C major / bright voicing) ──────
// [frequency, amplitude, vibrato rate, vibrato depth]
const PADS = [
  [130.81, 0.15, 0.06, 0.002],  // C3 — root (warm base)
  [164.81, 0.12, 0.07, 0.002],  // E3 — major third (bright!)
  [196.00, 0.14, 0.05, 0.002],  // G3 — fifth
  [261.63, 0.10, 0.08, 0.001],  // C4 — octave
  [329.63, 0.07, 0.09, 0.001],  // E4 — bright shimmer
  [523.25, 0.04, 0.11, 0.001],  // C5 — sparkle
];

// ── Rhythmic pulse frequencies for energy ─────────────────────
// These create a subtle pulsing "excitement" layer
const PULSE_BPM = 120;
const PULSE_HZ  = PULSE_BPM / 60; // 2 Hz pulse

// ── Arpeggio notes (major chord) for melodic shimmer ──────────
const ARPEGGIO = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

// ── Generate one sample ───────────────────────────────────────
function generateSample(t) {
  let sample = 0;

  // 1. Warm pad layer (major key — bright and warm)
  for (const [freq, amp, vibRate, vibDepth] of PADS) {
    const modFreq = freq * (1 + vibDepth * Math.sin(2 * Math.PI * vibRate * t));
    sample += amp * Math.sin(2 * Math.PI * modFreq * t);
  }

  // 2. Rhythmic pulse — adds energy and forward momentum
  const pulse = 0.6 + 0.4 * Math.pow(Math.sin(2 * Math.PI * PULSE_HZ * t), 2);
  sample *= pulse;

  // 3. High sparkle arpeggio — cycles through major chord notes
  const arpeggioIdx = Math.floor((t * 4) % ARPEGGIO.length); // 4 notes per second
  const arpeggioFreq = ARPEGGIO[arpeggioIdx];
  const arpeggioEnv = 0.5 + 0.5 * Math.cos(2 * Math.PI * 4 * t); // envelope per note
  sample += 0.03 * arpeggioEnv * Math.sin(2 * Math.PI * arpeggioFreq * t);

  // 4. Sub-bass pulse for warmth (felt more than heard)
  const subBass = 0.08 * Math.sin(2 * Math.PI * 65.41 * t); // C2
  const subPulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * (PULSE_HZ / 2) * t);
  sample += subBass * subPulse;

  // 5. Bright "ping" accent every 4 beats (every 2 seconds)
  const pingPhase = (t * 0.5) % 1; // repeats every 2 seconds
  if (pingPhase < 0.05) { // brief ping at the start of each cycle
    const pingEnv = 1 - (pingPhase / 0.05); // quick decay
    sample += 0.04 * pingEnv * Math.sin(2 * Math.PI * 1046.50 * t); // C6 ping
  }

  // 6. Energy swell — medium-speed modulation (excitement builds and releases)
  const swell = 0.75 + 0.25 * Math.sin(2 * Math.PI * (1 / 10) * t); // 10-second cycle
  sample *= swell;

  // 7. Larger movement wave (30-second cycle) to prevent monotony
  const wave = 0.85 + 0.15 * Math.sin(2 * Math.PI * (1 / 30) * t + 0.8);
  sample *= wave;

  // 8. Fade in / fade out
  const fadeIn  = Math.min(1, t / 3);         // 3-second fade in (quick start)
  const fadeOut = Math.min(1, (DURATION - t) / 4); // 4-second fade out
  sample *= fadeIn * fadeOut;

  // 9. Master volume
  sample *= 0.45;

  return sample;
}

// ── Write WAV ─────────────────────────────────────────────────
function writeWav(filepath, samples) {
  const numSamples  = samples.length;
  const dataSize    = numSamples * (BIT_DEPTH / 8) * CHANNELS;
  const fileSize    = 44 + dataSize;
  const buffer      = Buffer.alloc(fileSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(fileSize - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(CHANNELS, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * CHANNELS * (BIT_DEPTH / 8), 28);
  buffer.writeUInt16LE(CHANNELS * (BIT_DEPTH / 8), 32);
  buffer.writeUInt16LE(BIT_DEPTH, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), offset);
    offset += 2;
  }

  writeFileSync(filepath, buffer);
}

// ── Main ──────────────────────────────────────────────────────
console.log(`Generating ${DURATION}s upbeat ambient track at ${SAMPLE_RATE} Hz...`);

const totalSamples = SAMPLE_RATE * DURATION;
const samples = new Float64Array(totalSamples);

for (let i = 0; i < totalSamples; i++) {
  const t = i / SAMPLE_RATE;
  samples[i] = generateSample(t);
  if (i % (SAMPLE_RATE * 30) === 0) {
    process.stdout.write(`\r  ${Math.round((i / totalSamples) * 100)}% complete`);
  }
}

const outDir  = join(__dirname, '..', 'public', 'music');
mkdirSync(outDir, { recursive: true });

const outPath = join(outDir, 'ambient-bg.wav');
writeWav(outPath, samples);

const sizeMB = (Buffer.byteLength(Buffer.alloc(44 + totalSamples * 2)) / 1024 / 1024).toFixed(1);
console.log(`\r  100% complete — ${outPath}`);
console.log(`  Size: ~${sizeMB} MB | Duration: ${DURATION}s | BPM: ${PULSE_BPM} | Key: C major`);
