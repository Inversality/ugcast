// Gated app surface — API key management. Kept out of the search index.
export const metadata = {
  title: "Developers & API Keys",
  description:
    "Manage your UGCast API keys and integrate AI UGC video generation programmatically.",
  robots: { index: false, follow: false },
};

export default function DevelopersLayout({ children }) {
  return children;
}
