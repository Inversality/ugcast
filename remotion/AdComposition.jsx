// The UGC ad composition: sequences talking-avatar / b-roll clips back-to-back,
// burns word-timed captions, applies fade transitions, and lays a background
// music track over the whole thing. This component is isomorphic — the editor
// renders it live via @remotion/player and /api/render renders it to MP4.
import {
  AbsoluteFill, Series, OffthreadVideo, Audio, useCurrentFrame, interpolate,
} from "remotion";

const FPS = 30;

// Total composition length in frames, derived from the scene list.
export function totalDurationInFrames(scenes = []) {
  return Math.max(1, scenes.reduce((sum, s) => sum + (s.durationInFrames || FPS), 0));
}

function Caption({ text, style }) {
  if (!text) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 6%", paddingBottom: "14%" }}>
      <span
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 800,
          fontSize: style?.fontSize || 64,
          lineHeight: 1.15,
          textAlign: "center",
          color: style?.color || "#ffffff",
          textShadow: "0 4px 18px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)",
          WebkitTextStroke: style?.stroke ? `2px ${style.stroke}` : undefined,
          textTransform: style?.uppercase ? "uppercase" : "none",
        }}
      >
        {text}
      </span>
    </AbsoluteFill>
  );
}

function SceneClip({ scene, captionStyle }) {
  const frame = useCurrentFrame(); // relative to this scene (Series.Sequence)
  const dur = scene.durationInFrames || FPS;

  // Fade transition in/out at scene boundaries.
  const fade = scene.transition === "fade";
  const opacity = fade
    ? interpolate(frame, [0, 10, dur - 10, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;

  const activeCaption = scene.captionsEnabled
    ? (scene.captions || []).find((c) => frame >= c.fromFrame && frame < c.toFrame)
    : null;

  return (
    <AbsoluteFill style={{ opacity, backgroundColor: "#000" }}>
      {scene.videoUrl && (
        <OffthreadVideo src={scene.videoUrl} muted={scene.muted} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      )}
      {activeCaption && <Caption text={activeCaption.text} style={captionStyle} />}
    </AbsoluteFill>
  );
}

export default function AdComposition({ scenes = [], music, captionStyle }) {
  const frame = useCurrentFrame();
  const total = totalDurationInFrames(scenes);

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {scenes.map((scene) => (
          <Series.Sequence key={scene.id} durationInFrames={scene.durationInFrames || FPS}>
            <SceneClip scene={scene} captionStyle={captionStyle} />
          </Series.Sequence>
        ))}
      </Series>

      {music?.url && (
        <Audio
          src={music.url}
          loop
          volume={interpolate(frame, [0, 20, total - 30, total], [0, music.volume ?? 0.25, music.volume ?? 0.25, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      )}
    </AbsoluteFill>
  );
}
