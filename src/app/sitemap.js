import config from "@/lib/config";

// App Router sitemap (served at /sitemap.xml). Only public, indexable marketing
// surfaces belong here — the app/auth pages (/dashboard, /editor, /login,
// /actors, /developers) are gated and excluded (see robots.js).
export default function sitemap() {
  const base = config?.siteUrl || "http://localhost:3000";
  const now = new Date();

  const routes = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  ];

  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
