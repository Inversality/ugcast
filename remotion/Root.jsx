// Remotion root: registers the composition the server renderer selects by id.
// Duration/dimensions are computed per-render from the timeline via
// calculateMetadata so each project renders at its true length.
import { Composition } from "remotion";
import AdComposition, { totalDurationInFrames } from "./AdComposition.jsx";

export const FPS = 30;

export function RemotionRoot() {
  return (
    <Composition
      id="AdComposition"
      component={AdComposition}
      durationInFrames={300}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ scenes: [], music: null, captionStyle: {} }}
      calculateMetadata={({ props }) => ({
        durationInFrames: totalDurationInFrames(props.scenes),
        fps: FPS,
        width: props.width || 1080,
        height: props.height || 1920,
      })}
    />
  );
}
