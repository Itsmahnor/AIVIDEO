import {Composition} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';
import {testCompositionSchema} from '@ai-video-studio/schema';
import type {FC} from 'react';
import {TestComposition} from './TestComposition';

const {fontFamily} = loadFont();

const defaultProps = {
  title: 'Test composition',
  theme: {
    colors: {background: '#111827', foreground: '#f9fafb'},
    fonts: {body: fontFamily},
  },
};

export const RemotionRoot: FC = () => {
  return (
    <Composition
      id="TestComposition"
      component={TestComposition}
      durationInFrames={150}
      fps={30}
      width={1280}
      height={720}
      defaultProps={defaultProps}
      schema={testCompositionSchema}
    />
  );
};

export {defaultProps};
