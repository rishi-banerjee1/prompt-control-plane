import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import screens from '../narration/style-v2-screens.json';
import narration from '../narration/timeline-male-v1.json';

const FPS = 30;
const musicVolume = (frame: number) => {
  const seconds = frame / FPS;
  const speaking = Math.max(0, ...narration.segments.map(({start, end}) =>
    Math.max(0, Math.min(1, (seconds - start + 0.3) / 0.3, (end + 0.3 - seconds) / 0.3)),
  ));
  return 0.2 - speaking * 0.1;
};

// All essential content is visible before speech starts and held through its end.
// No typewriter or staggered reveals that could race the approved narration.
export const StyledExplainer: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const index = screens.findIndex(({start, end}) => t >= start && t < end);
  const screen = screens[index < 0 ? screens.length - 1 : index];
  const enter = interpolate(f - screen.start * FPS, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const detailed = Boolean(screen.code || screen.items);

  return <AbsoluteFill style={{background: '#090d18', color: '#f4f6fc', fontFamily: 'Arial, sans-serif', padding: '90px 120px'}}>
    <Sequence from={0} durationInFrames={75 * FPS}>
      <Audio src={staticFile('music/gentle-flow.wav')} volume={musicVolume} />
    </Sequence>
    <Sequence from={75 * FPS}>
      <Audio src={staticFile('music/bright-steps.wav')} volume={(frame) => musicVolume(frame + 75 * FPS)} loop />
    </Sequence>
    <Audio src={staticFile('narration/pcp-male-v1.wav')} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 30%, #26316466, transparent 65%)'}} />
    <div style={{display: 'flex', alignItems: 'center', gap: 18, fontSize: 27, letterSpacing: 3, color: '#a4b2cc'}}>
      <span style={{width: 12, height: 12, borderRadius: 6, background: '#5de2d4'}} /> PROMPT CONTROL PLANE
    </div>
    <div data-content style={{position: 'relative', marginTop: detailed ? 64 : 105, opacity: enter, transform: `translateY(${(1 - enter) * 20}px)`}}>
      <div style={{color: '#5de2d4', fontSize: 26, letterSpacing: 3, marginBottom: detailed ? 24 : 32}}>{String(index + 1).padStart(2, '0')} / {screen.label}</div>
      <div style={{fontSize: detailed ? 76 : 100, lineHeight: 1.08, fontWeight: 700, letterSpacing: detailed ? -2 : -3, maxWidth: detailed ? 1600 : 1330}}>{screen.title}</div>
      <div style={{marginTop: detailed ? 30 : 50, padding: '24px 34px', borderLeft: '4px solid #5de2d4', background: '#151e31', fontSize: detailed ? 32 : 36, lineHeight: 1.5, color: '#c6d1e4', maxWidth: 1530}}>{screen.detail}</div>
      {screen.code && <pre style={{margin: '26px 0 0', padding: '24px 32px', border: '1px solid #34425c', borderRadius: 10, background: '#0d1423', color: '#b0f3e6', fontFamily: 'Menlo, monospace', fontSize: 29, lineHeight: 1.5, whiteSpace: 'pre-wrap'}}>{screen.code}</pre>}
      {screen.items && <div style={{display: 'flex', flexWrap: 'wrap', gap: 18, marginTop: 26}}>
        {screen.items.map((item) => <div key={item} style={{padding: '18px 24px', background: '#151e31', border: '1px solid #34425c', borderRadius: 10, color: '#d2deef', fontSize: 27, lineHeight: 1.35}}>{item}</div>)}
      </div>}
    </div>
    <div style={{position: 'absolute', bottom: 76, left: 120, right: 120, display: 'flex', justifyContent: 'space-between', fontSize: 24, color: '#8f9fba'}}>
      <span>Governance before generation</span><span>getpcp.site</span>
    </div>
    <div style={{position: 'absolute', bottom: 0, left: 0, height: 5, width: `${t / 300 * 100}%`, background: '#5de2d4'}} />
  </AbsoluteFill>;
};
