import "./globals.css";
import { Providers } from "./providers";
import Navbar from "../components/Navbar";
import { Inter } from "next/font/google";
import config from "@/lib/config";
import { SUBSCRIPTIONS, TOPUPS } from "@/lib/pricing";

const inter = Inter({ subsets: ["latin"], display: "swap" });

const siteUrl = config?.siteUrl || config?.auth?.url || "http://localhost:3000";

const title = "UGCast — AI UGC Video Ads with AI Actors (Arcads & MakeUGC Alternative)";
const description =
  "UGCast generates scroll-stopping AI UGC video ads with realistic AI actors, scripts, and voiceovers — an open-source alternative to Arcads and MakeUGC, powered by Veo 3.1, Seedance, Grok Video, and more.";

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s — UGCast",
  },
  description,
  applicationName: "UGCast",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "UGCast",
    "AI UGC",
    "UGC ads",
    "AI UGC actors",
    "AI actors",
    "AI video ads",
    "Arcads alternative",
    "MakeUGC alternative",
    "AI video generator",
    "text to video",
    "image to video",
    "Veo 3.1",
    "Seedance",
    "AI voiceover",
    "AI ad creative",
  ],
  authors: [{ name: "UGCast" }],
  creator: "UGCast",
  publisher: "UGCast",
  category: "technology",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-video-preview": -1,
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "UGCast — AI UGC Video Ads with AI Actors",
    description:
      "Cast realistic AI actors, write scripts, and generate scroll-stopping UGC video ads. The open-source Arcads & MakeUGC alternative.",
    url: siteUrl,
    siteName: "UGCast",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UGCast — AI UGC Video Ads with AI Actors",
    description:
      "Cast realistic AI actors, write scripts, and generate scroll-stopping UGC video ads. The open-source Arcads & MakeUGC alternative.",
  },
};

export const viewport = {
  themeColor: "#0a130d",
};

// Structured data (JSON-LD) — gives search engines + LLMs an explicit, machine
// readable description of the org, the site, and the product/pricing so the
// listing can earn rich results. Emitted once in the root layout.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "UGCast",
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      description,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "UGCast",
      description,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en-US",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#software`,
      name: "UGCast",
      url: siteUrl,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      description,
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "USD",
        lowPrice: "5.00",
        highPrice: "99.00",
        offerCount: SUBSCRIPTIONS.length + TOPUPS.length,
      },
    },
  ],
};

export default function RootLayout({ children }) {
  const theme = config?.theme || "slate-indigo";

  return (
    <html lang="en" className="h-full w-full" data-theme={theme}>
      <head>
        {/* Apply the saved theme before paint to avoid a flash of the default theme. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('ugcast-theme');if(t){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.className} h-full w-full flex flex-col antialiased bg-bg-page text-primary-text overflow-hidden`}>
        <Providers>
          <Navbar />
          <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden min-h-0">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}

