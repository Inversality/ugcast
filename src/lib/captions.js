// Caption timing. For talking-avatar clips we already know the spoken script,
// so captions can be derived deterministically by distributing words across the
// clip's duration — no transcription service required. (For raw b-roll with no
// script, callers simply skip captions.)

const FPS = 30;

// Split a script into short caption chunks (a few words each) timed evenly
// across `durationInFrames`. Returns [{ text, fromFrame, toFrame }] with frames
// relative to the start of the clip.
export function scriptToCaptions(script, durationInFrames, wordsPerChunk = 4) {
  if (!script?.trim() || !durationInFrames) return [];

  const words = script.trim().replace(/\s+/g, " ").split(" ");
  const chunks = [];
  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(" "));
  }
  if (!chunks.length) return [];

  // Weight each chunk's on-screen time by its word count so longer lines linger.
  const totalWords = words.length;
  let cursor = 0;
  return chunks.map((text) => {
    const chunkWords = text.split(" ").length;
    const span = Math.round((chunkWords / totalWords) * durationInFrames);
    const fromFrame = cursor;
    const toFrame = Math.min(durationInFrames, cursor + Math.max(1, span));
    cursor = toFrame;
    return { text, fromFrame, toFrame };
  });
}

export function secondsToFrames(seconds, fps = FPS) {
  return Math.round((seconds || 0) * fps);
}
