# Full five-minute style review

Status: approved and published as `docs/pcp-styled-v2.mp4`.

The approved 30-second design is extended across all 18 spoken passages.
Source composition: `src/StyledExplainer.tsx`, composition ID `PcpStyledReview`.
Screen manifest: `narration/style-v2-screens.json`.
Approved narration: `narration/timeline-male-v1.json`.

Screens use the same dark background, sans-serif typography, teal accents,
large headings, restrained entrances and reading space as the approved sample.
Code and configuration screens use a compact variant to keep examples readable.
All content is visible before its narration begins and held through its end.
The complete existing male narration and music mix is copied from the approved
video without re-encoding, retiming, edits or regeneration.

Render picture:

```sh
npx tsc --noEmit
npx remotion render src/index.tsx PcpStyledReview out/pcp-styled-v2-silent.mp4 --muted --crf 16 --concurrency 6
```

Copy approved audio into the local review:

```sh
ffmpeg -hide_banner -loglevel error -y -i out/pcp-styled-v2-silent.mp4 -i out/pcp-explainer-narrated-male-v1.mp4 -map 0:v:0 -map 1:a:0 -c copy -movflags +faststart out/pcp-explainer-styled-male-v2.mp4
```

Verification evidence goes in `out/styled-v2-sync-report.json`,
`out/styled-v2-stills/` and `out/styled-v2-verification.json`.
The timing check requires complete 300-second coverage, one screen per passage,
entrance completion before speech and no screen exit before speech ends.
Final verification must include all 18 layouts, full media decode, stream
duration and frame count, and equality of the approved and final audio streams.

The website asset is `docs/pcp-styled-v2.mp4`.

Verified delivery: `out/pcp-explainer-styled-male-v2.mp4`.
Exactly 300 seconds, 9000 frames, 1920x1080, 30 fps, H.264 and AAC.
All 18 timing windows and screen layouts passed. Full media decode passed.
The final AAC stream has the same SHA-256 as the approved source audio stream.
Representative frames from the finished MP4 were visually inspected as well.
Final source SHA-256: `aa3b9c1c9f5a3842f932893d2f863b907a63eaae345f04e0522f92e001a10837`.
TypeScript and diff whitespace checks passed. Published after review.
