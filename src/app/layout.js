import "./globals.css";
import { Providers } from "./providers";
import Navbar from "../components/Navbar";
import { Inter } from "next/font/google";
import config from "@/lib/config";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata = {
  metadataBase: new URL(config?.auth?.url || "http://localhost:3000"),
  title: "UGCast — AI UGC Video Ads with AI Actors (Arcads & MakeUGC Alternative)",
  description:
    "UGCast generates scroll-stopping AI UGC video ads with realistic AI actors, scripts, and voiceovers — an open-source alternative to Arcads and MakeUGC, powered by Veo 3.1, Seedance, Grok Video, and more.",
  applicationName: "UGCast",
  manifest: "/manifest.webmanifest",
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
  ],
  openGraph: {
    title: "UGCast — AI UGC Video Ads with AI Actors",
    description:
      "Cast realistic AI actors, write scripts, and generate scroll-stopping UGC video ads. The open-source Arcads & MakeUGC alternative.",
    siteName: "UGCast",
    type: "website",
  },
};

export const viewport = {
  themeColor: "#0a130d",
};

export default function RootLayout({ children }) {
  const theme = config?.theme || "slate-indigo";

  return (
    <html lang="en" className="h-full w-full" data-theme={theme}>
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

