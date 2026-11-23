import React from 'react';
import {Composition} from 'remotion';
import {PcpExplainer} from './PcpExplainer';
import {StyledExplainer} from './StyledExplainer';
import {FPS, WIDTH, HEIGHT, TOTAL_DURATION_FRAMES} from './theme';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PcpStyledReview"
        component={StyledExplainer}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="PcpExplainer"
        component={PcpExplainer}
        durationInFrames={TOTAL_DURATION_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
