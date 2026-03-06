import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  spring,
  useVideoConfig,
  Sequence,
} from 'remotion';
import {theme, FPS} from '../theme';
import {FadeIn, GlowText, ScaleIn, Counter} from '../components/AnimatedText';

export const Closing: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow pulse
  const pulse = interpolate(Math.sin(frame * 0.015), [-1, 1], [0.15, 0.4]);

  return (
    <AbsoluteFill style={{background: theme.bg}}>
      {/* Background gradient orbs */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.primary}${Math.round(pulse * 25).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          top: '-10%',
          right: '-10%',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.accent}${Math.round(pulse * 20).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
          bottom: '-10%',
          left: '-5%',
        }}
      />

      {/* Stats recap */}
      <Sequence from={0} durationInFrames={FPS * 12}>
        <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{display: 'flex', gap: 60}}>
            <StatBox value="0" label="LLM Calls" color={theme.accent} delay={5} />
            <StatBox value="20" label="MCP Tools" color={theme.primary} delay={10} />
            <StatBox value="15" label="CLI Commands" color={theme.accentGreen} delay={15} />
            <StatBox value="10" label="Models" color={theme.accentYellow} delay={20} />
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Main CTA */}
      <Sequence from={FPS * 10} durationInFrames={FPS * 20}>
        <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <ScaleIn delay={5}>
            <div style={{fontSize: 72, fontWeight: 900, color: theme.white, textAlign: 'center', lineHeight: 1.2}}>
              Stop guessing.
            </div>
          </ScaleIn>
          <FadeIn delay={FPS * 2}>
            <div style={{fontSize: 72, fontWeight: 900, color: theme.white, textAlign: 'center', lineHeight: 1.2}}>
              Start <GlowText color={theme.accent}>governing</GlowText>.
            </div>
          </FadeIn>

          <FadeIn delay={FPS * 5} style={{marginTop: 60}}>
            <div style={{
              background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`,
              borderRadius: 16,
              padding: '20px 60px',
              fontSize: 28,
              fontWeight: 700,
              color: theme.white,
              textAlign: 'center',
              boxShadow: `0 0 40px ${theme.primary}44`,
            }}>
              npm install -g pcp-engine
            </div>
          </FadeIn>

          <FadeIn delay={FPS * 8} style={{marginTop: 40}}>
            <div style={{display: 'flex', gap: 40, alignItems: 'center'}}>
              <LinkItem label="getpcp.site" />
              <span style={{color: theme.textDim}}>|</span>
              <LinkItem label="npm: pcp-engine" />
              <span style={{color: theme.textDim}}>|</span>
              <LinkItem label="GitHub: prompt-control-plane" />
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const StatBox: React.FC<{
  value: string;
  label: string;
  color: string;
  delay: number;
}> = ({value, label, color, delay}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame: frame - delay, fps, config: {damping: 14}});
  return (
    <div
      style={{
        transform: `scale(${scale})`,
        textAlign: 'center',
        minWidth: 160,
      }}
    >
      <div style={{fontSize: 64, fontWeight: 900, color}}>{value}</div>
      <div style={{fontSize: 18, color: theme.textMuted, marginTop: 8}}>{label}</div>
    </div>
  );
};

const LinkItem: React.FC<{label: string}> = ({label}) => (
  <span style={{
    fontSize: 20,
    color: theme.accent,
    fontFamily: "'JetBrains Mono', monospace",
  }}>
    {label}
  </span>
);
