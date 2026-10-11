import {Player} from '@remotion/player';
import {DynamicVideo, type DynamicVideoProps} from '@ai-video-studio/video/player';
import {getTotalDurationInFrames, type BrandKit, type SceneJSON} from '@ai-video-studio/schema';
import {useMemo, type FC} from 'react';

/** Live preview: the same DynamicVideo composition that Remotion renders to MP4. */
export const Preview: FC<{sceneJson: SceneJSON; brand: BrandKit}> = ({sceneJson, brand}) => {
  const inputProps = useMemo<DynamicVideoProps>(() => ({sceneJson, brand}), [sceneJson, brand]);
  const {width, height, fps} = sceneJson.meta;
  const maxWidth = height > width ? 360 : height === width ? 560 : 960;
  return (
    <div style={{maxWidth, width: '100%'}} className="mx-auto overflow-hidden rounded-xl border border-slate-200 bg-black shadow-md">
      <Player
        component={DynamicVideo}
        inputProps={inputProps}
        durationInFrames={getTotalDurationInFrames(sceneJson)}
        fps={fps}
        compositionWidth={width}
        compositionHeight={height}
        controls
        loop
        autoPlay
        initialFrame={0}
        style={{width: '100%'}}
        acknowledgeRemotionLicense
      />
    </div>
  );
};
