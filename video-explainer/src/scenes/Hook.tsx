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
import {FadeIn, GlowText, TypeWriter} from '../components/AnimatedText';

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Background pulse
  const pulse = interpolate(Math.sin(frame * 0.02), [-1, 1], [0.3, 0.6]);

  return (
    <AbsoluteFill
      style={{
        background: theme.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 80,
      }}
    >
      {/* Subtle gradient orb */}
      <div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.primary}${Math.round(pulse * 30).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Opening problem statement */}
      <Sequence from={0} durationInFrames={FPS * 8}>
        <FadeIn delay={5} style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80}}>
          <div style={{textAlign: 'center'}}>
            <div
              style={{
                fontSize: 28,
                color: theme.textMuted,
                letterSpacing: 4,
                textTransform: 'uppercase',
                marginBottom: 40,
              }}
            >
              Before you send a prompt
            </div>
            <div style={{fontSize: 96, fontWeight: 800, color: theme.white, lineHeight: 1.1}}>
              <GlowText color={theme.accentRed}>Unclear</GlowText> prompts
            </div>
            <div
              style={{
                fontSize: 48,
                color: theme.text,
                marginTop: 20,
                fontWeight: 300,
              }}
            >
              leave important decisions unstated
            </div>
          </div>
        </FadeIn>
      </Sequence>

      {/* Bad prompt example */}
      <Sequence from={FPS * 8} durationInFrames={FPS * 10}>
        <FadeIn delay={0} style={{position: 'absolute', top: '15%', left: '10%', width: '80%'}}>
          <div style={{textAlign: 'center', marginBottom: 40}}>
            <span style={{fontSize: 22, color: theme.textDim, letterSpacing: 2, textTransform: 'uppercase'}}>
              Sound familiar?
            </span>
          </div>
          <div
            style={{
              background: theme.bgCard,
              border: `2px solid ${theme.accentRed}44`,
              borderRadius: 16,
              padding: '40px 48px',
              textAlign: 'center',
            }}
          >
            <div style={{fontSize: 42, fontFamily: "'JetBrains Mono', monospace", color: theme.text}}>
              <TypeWriter text='"make it better"' startFrame={5} speed={3} />
            </div>
            <div style={{marginTop: 30, display: 'flex', justifyContent: 'center', gap: 24}}>
              <Badge label="Score: 45/100" color={theme.accentRed} delay={FPS * 3} />
              <Badge label="Risk: Medium" color={theme.accentYellow} delay={FPS * 3.5} />
              <Badge label="Vague" color={theme.accentRed} delay={FPS * 4} />
            </div>
          </div>
        </FadeIn>
      </Sequence>

      {/* Transition — "What if..." */}
      <Sequence from={FPS * 20} durationInFrames={FPS * 10}>
        <FadeIn delay={0} style={{position: 'absolute', bottom: '15%', left: 0, width: '100%'}}>
          <div style={{textAlign: 'center'}}>
            <div style={{fontSize: 52, fontWeight: 700, color: theme.white}}>
              What if you could <GlowText color={theme.accent}>catch this</GlowText>
            </div>
            <div style={{fontSize: 52, fontWeight: 700, color: theme.white, marginTop: 10}}>
              before it reaches the LLM?
            </div>
          </div>
        </FadeIn>
      </Sequence>
    </AbsoluteFill>
  );
};

const Badge: React.FC<{label: string; color: string; delay: number}> = ({
  label,
  color,
  delay,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scale = spring({frame: frame - delay, fps, config: {damping: 12}});
  return (
    <span
      style={{
        transform: `scale(${scale})`,
        display: 'inline-block',
        background: `${color}18`,
        border: `1px solid ${color}66`,
        color,
        padding: '8px 20px',
        borderRadius: 8,
        fontSize: 20,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
};
