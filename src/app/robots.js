import config from "@/lib/config";

// App Router robots (served at /robots.txt). Allow crawling of the public
// marketing surface; keep the API and gated app/auth pages out of the index.
export default function robots() {
  const base = config?.siteUrl || "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/editor",
          "/login",
          "/actors",
          "/developers",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
