// Gated app surface — the video editor (also wraps /editor/[projectId]). Kept
// out of the search index.
export const metadata = {
  title: "Editor",
  description: "Edit and render your AI UGC video ads in UGCast.",
  robots: { index: false, follow: false },
};

export default function EditorLayout({ children }) {
  return children;
}
