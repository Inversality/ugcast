// Auth utility page — no SEO value, keep out of the index.
export const metadata = {
  title: "Sign In",
  description: "Sign in to UGCast to generate AI UGC video ads.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }) {
  return children;
}
