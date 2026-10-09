import {Composition} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Inter';
import {testCompositionSchema} from '@ai-video-studio/schema';
import type {FC} from 'react';
import {TestComposition} from './TestComposition';
import {TokenPreview, previewBrands, tokenPreviewDurationInFrames, tokenPreviewPropsSchema} from './TokenPreview';
import {aspectRatioConfigs, standardFps} from './tokens';

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
    <>
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
      <Composition
        id="TokenPreview9x16"
        component={TokenPreview}
        durationInFrames={tokenPreviewDurationInFrames}
        fps={standardFps}
        width={aspectRatioConfigs['9:16'].width}
        height={aspectRatioConfigs['9:16'].height}
        defaultProps={previewBrands.light}
        schema={tokenPreviewPropsSchema}
      />
      <Composition
        id="TokenPreview16x9"
        component={TokenPreview}
        durationInFrames={tokenPreviewDurationInFrames}
        fps={standardFps}
        width={aspectRatioConfigs['16:9'].width}
        height={aspectRatioConfigs['16:9'].height}
        defaultProps={previewBrands.dark}
        schema={tokenPreviewPropsSchema}
      />
    </>
  );
};

export {defaultProps};
