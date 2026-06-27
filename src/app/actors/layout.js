// Gated app surface — useful title for browser tabs/shares, but kept out of the
// search index since the content requires authentication.
export const metadata = {
  title: "AI Actors",
  description:
    "Browse and create realistic AI UGC actors for your video ads in UGCast.",
  robots: { index: false, follow: false },
};

export default function ActorsLayout({ children }) {
  return children;
}
