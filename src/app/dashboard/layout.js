// Gated app surface — user's creations. Kept out of the search index.
export const metadata = {
  title: "Dashboard",
  description: "Your UGCast video creations and generation history.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }) {
  return children;
}
