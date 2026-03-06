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
import {Terminal} from '../components/Terminal';

export const Powerhouses: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{background: theme.bg}}>
      {/* Section title */}
      <Sequence from={0} durationInFrames={FPS * 8}>
        <AbsoluteFill style={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <FadeIn delay={5}>
            <div style={{textAlign: 'center'}}>
              <div style={{fontSize: 28, color: theme.primary, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 20}}>
                Two Powerhouse Commands
              </div>
              <div style={{fontSize: 64, fontWeight: 800, color: theme.white}}>
                <GlowText color={theme.accent}>preflight</GlowText> &{' '}
                <GlowText color={theme.primary}>optimize</GlowText>
              </div>
              <div style={{fontSize: 24, color: theme.textMuted, marginTop: 20}}>
                90% of use cases covered by just two commands
              </div>
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>

      {/* Preflight demo */}
      <Sequence from={FPS * 7} durationInFrames={FPS * 25}>
        <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60}}>
          <FadeIn delay={0}>
            <div style={{textAlign: 'center', marginBottom: 8}}>
              <div style={{fontSize: 18, color: theme.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12}}>
                Command 1
              </div>
              <div style={{fontSize: 40, fontWeight: 700, color: theme.white, marginBottom: 24}}>
                pcp preflight
              </div>
            </div>
          </FadeIn>
          <FadeIn delay={FPS * 1}>
            <Terminal
              title="terminal"
              width={900}
              lines={[
                {text: '$ pcp preflight "Explain what this code does" --json', color: theme.textMuted, delay: FPS * 1.5},
                {text: '', delay: FPS * 3},
                {text: '  "pqs": 42,', color: theme.accentYellow, delay: FPS * 4},
                {text: '  "risk_level": "low",', color: theme.accentGreen, delay: FPS * 5},
                {text: '  "task_type": "question",', color: theme.text, delay: FPS * 6},
                {text: '  "recommended_model": "haiku",', color: theme.accentGreen, delay: FPS * 7},
                {text: '  "savings": "63% cheaper than gpt-4o"', color: theme.accent, delay: FPS * 8},
              ]}
            />
          </FadeIn>
          <FadeIn delay={FPS * 10} style={{marginTop: 30}}>
            <div style={{display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap'}}>
              <HighlightTag label="Prompt Quality Score" color={theme.accent} />
              <HighlightTag label="Risk Assessment" color={theme.accentRed} />
              <HighlightTag label="Model Routing" color={theme.accentGreen} />
              <HighlightTag label="Cost Savings" color={theme.accentYellow} />
            </div>
          </FadeIn>
          <FadeIn delay={FPS * 14} style={{marginTop: 24}}>
            <div style={{
              background: `${theme.accentGreen}12`,
              border: `1px solid ${theme.accentGreen}44`,
              borderRadius: 12,
              padding: '14px 32px',
              fontSize: 20,
              color: theme.accentGreen,
              textAlign: 'center',
            }}>
              Read-only. Zero side effects. Safe for CI.
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>

      {/* Optimize demo */}
      <Sequence from={FPS * 32} durationInFrames={FPS * 28}>
        <AbsoluteFill style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60}}>
          <FadeIn delay={0}>
            <div style={{textAlign: 'center', marginBottom: 8}}>
              <div style={{fontSize: 18, color: theme.primary, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 12}}>
                Command 2
              </div>
              <div style={{fontSize: 40, fontWeight: 700, color: theme.white, marginBottom: 24}}>
                pcp optimize
              </div>
            </div>
          </FadeIn>

          {/* Before → After side by side, centered */}
          <div style={{display: 'flex', gap: 40, alignItems: 'stretch', justifyContent: 'center'}}>
            <FadeIn delay={FPS * 1}>
              <div style={{width: 380}}>
                <div style={{fontSize: 14, color: theme.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, textAlign: 'center'}}>
                  Before
                </div>
                <div style={{
                  background: theme.bgCard,
                  border: `1px solid ${theme.accentRed}44`,
                  borderRadius: 12,
                  padding: '24px 28px',
                  fontSize: 24,
                  color: theme.text,
                  fontFamily: "'JetBrains Mono', monospace",
                  textAlign: 'center',
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  "fix the auth bug"
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={FPS * 3} style={{alignSelf: 'center'}}>
              <div style={{fontSize: 36, color: theme.accent}}>&#10132;</div>
            </FadeIn>

            <FadeIn delay={FPS * 5}>
              <div style={{width: 520}}>
                <div style={{fontSize: 14, color: theme.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, textAlign: 'center'}}>
                  After PCP Optimize
                </div>
                <div style={{
                  background: theme.bgCard,
                  border: `1px solid ${theme.accentGreen}44`,
                  borderRadius: 12,
                  padding: '20px 24px',
                  fontSize: 16,
                  color: theme.text,
                  fontFamily: "'JetBrains Mono', monospace",
                  lineHeight: 1.7,
                }}>
                  <div style={{color: theme.accent}}>{'<role>'}Debug specialist{'</role>'}</div>
                  <div style={{color: theme.primary}}>{'<goal>'}Fix the authentication bug{'</goal>'}</div>
                  <div style={{color: theme.accentYellow}}>{'<constraints>'}</div>
                  <div style={{paddingLeft: 16}}>- Identify root cause before changing code</div>
                  <div style={{paddingLeft: 16}}>- Preserve backward compatibility</div>
                  <div style={{paddingLeft: 16}}>- Add regression test</div>
                  <div style={{color: theme.accentYellow}}>{'</constraints>'}</div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Score transformation centered */}
          <FadeIn delay={FPS * 12} style={{marginTop: 30}}>
            <div style={{display: 'flex', gap: 24, alignItems: 'center', justifyContent: 'center'}}>
              <ScoreBadge label="45" sublabel="Before" color={theme.accentRed} />
              <div style={{fontSize: 32, color: theme.accent}}>&#10132;</div>
              <ScoreBadge label="82" sublabel="After" color={theme.accentGreen} />
            </div>
          </FadeIn>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

const HighlightTag: React.FC<{label: string; color: string}> = ({label, color}) => (
  <div style={{
    background: `${color}15`,
    border: `1px solid ${color}44`,
    borderRadius: 10,
    padding: '10px 20px',
    fontSize: 17,
    fontWeight: 600,
    color,
  }}>
    {label}
  </div>
);

const ScoreBadge: React.FC<{label: string; sublabel: string; color: string}> = ({label, sublabel, color}) => (
  <div style={{
    background: `${color}15`,
    border: `2px solid ${color}55`,
    borderRadius: 16,
    padding: '16px 28px',
    textAlign: 'center',
  }}>
    <div style={{fontSize: 42, fontWeight: 900, color}}>{label}</div>
    <div style={{fontSize: 14, color: theme.textMuted, marginTop: 4}}>{sublabel}</div>
  </div>
);
