# Narrated Video Production

Approved voice: original male sample, VoiceStudio KittenTTS `expr-voice-2-m`, speed 1.0, seed 42.
Finished timeline: exactly 300 seconds / 9000 frames at 30 fps.

## Sources

`timeline-male-v1.json` is the authoritative spoken script and timing plan.
`screen-cues.json` records the actual screen reveals and exits from the Remotion scenes.
Earlier script drafts and voice samples remain preserved for reference.

The narration builder checks every passage against its matching screen window.
It measures generated audio before placement and refuses a passage that would
need excessive acceleration or exceed its slot. Deliberate gaps allow reading
and demonstration time. Spoken text and visual examples have been aligned to
the existing scene order.

## Build

With VoiceStudio running locally, from the repository root:

```sh
node video-explainer/narration/build-male.mjs
node video-explainer/narration/verify-male.mjs
npm run build --prefix video-explainer
```

The Remotion composition includes narration and lowered music. Generated voice
assets are in `public/narration/`; timing and transcription evidence are under
`out/narration-male-v1/`.

For this review export, `finish-male.mjs` reuses the previously verified full
render, replacing the corrected opening, command, and recap frames. It mixes
the latest narration with music ducked under speech and exports
`out/pcp-explainer-narrated-male-v1.mp4`. The original full render stays intact.

```sh
node video-explainer/narration/finish-male.mjs
```

The export helper regenerates all corrected picture ranges. For a clean build
without the earlier verified picture, use the full Remotion build above.
If editing spoken text, assign the changed clip a new ID so its previous cached
speech cannot be reused. Full narration generation remains entirely outside
the deterministic PCP engine.

## Review Gate

Local finished video for user review only. No website publication is part of
this export. Verify final duration, frame count, full decode, audio levels,
and samples around each scene boundary before delivery.
