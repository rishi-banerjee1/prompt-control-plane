import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {FPS, SCENE_DURATIONS} from './theme';
import {Hook} from './scenes/Hook';
import {WhatIsPcp} from './scenes/WhatIsPcp';
import {Powerhouses} from './scenes/Powerhouses';
import {CiIntegration} from './scenes/CiIntegration';
import {Adoption} from './scenes/Adoption';
import {Closing} from './scenes/Closing';

const TRANSITION_FRAMES = 25; // ~0.8s crossfade between scenes

/**
 * Wraps each scene with smooth fade-in / fade-out transitions.
 * - First scene: only fades out at the end (its own Hook intro handles the opening)
 * - Last scene: only fades in at the start (its own Closing outro handles the end)
 * - Middle scenes: fade in from black + fade out to black
 * Also applies a subtle scale-down on exit for cinematic feel.
 */
const SceneTransition: React.FC<{
  children: React.ReactNode;
  durationInFrames: number;
  isFirst?: boolean;
  isLast?: boolean;
}> = ({children, durationInFrames, isFirst, isLast}) => {
  const frame = useCurrentFrame();

  // Fade in from black (skip for first scene — Hook has its own opening)
  const fadeIn = isFirst
    ? 1
    : interpolate(frame, [0, TRANSITION_FRAMES], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      });

  // Fade out to black (skip for last scene — Closing has its own ending)
  const fadeOut = isLast
    ? 1
    : interpolate(
        frame,
        [durationInFrames - TRANSITION_FRAMES, durationInFrames],
        [1, 0],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
      );

  // Subtle scale-down on exit for cinematic feel
  const scaleOut = isLast
    ? 1
    : interpolate(
        frame,
        [durationInFrames - TRANSITION_FRAMES, durationInFrames],
        [1, 0.98],
        {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
      );

  return (
    <AbsoluteFill
      style={{
        opacity: fadeIn * fadeOut,
        transform: `scale(${scaleOut})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const PcpExplainer: React.FC = () => {
  const d = SCENE_DURATIONS;
  let offset = 0;

  const scenes = [
    {Component: Hook, duration: d.hook},
    {Component: WhatIsPcp, duration: d.whatIsPcp},
    {Component: Powerhouses, duration: d.powerhouses},
    {Component: CiIntegration, duration: d.ciIntegration},
    {Component: Adoption, duration: d.adoption},
    {Component: Closing, duration: d.closing},
  ];

  return (
    <AbsoluteFill>
      {/* Ambient background music — royalty-free, generated from math */}
      <Audio src={staticFile('music/ambient-bg.wav')} volume={0.12} />

      {scenes.map(({Component, duration}, i) => {
        const from = offset;
        const frames = duration * FPS;
        offset += frames;
        return (
          <Sequence key={i} from={from} durationInFrames={frames}>
            <SceneTransition
              durationInFrames={frames}
              isFirst={i === 0}
              isLast={i === scenes.length - 1}
            >
              <Component />
            </SceneTransition>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
