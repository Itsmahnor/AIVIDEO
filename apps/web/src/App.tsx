import {Player} from '@remotion/player';
import {defaultProps, TestComposition} from '@ai-video-studio/video';
import type {FC} from 'react';
import {Card, CardContent, CardHeader, CardTitle} from './components/ui/card';

export const App: FC = () => {
  return (
    <main className="min-h-screen bg-background p-6 text-foreground">
      <Card className="mx-auto max-w-5xl">
        <CardHeader>
          <CardTitle>AI Video Studio</CardTitle>
        </CardHeader>
        <CardContent>
          <Player
            component={TestComposition}
            compositionWidth={1280}
            compositionHeight={720}
            durationInFrames={150}
            fps={30}
            inputProps={defaultProps}
            controls
            className="overflow-hidden rounded-md"
          />
        </CardContent>
      </Card>
    </main>
  );
};
