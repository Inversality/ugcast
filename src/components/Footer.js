"use client";

import Link from "next/link";
import config from "@/lib/config";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const appName = config?.appName || "UGCast";

  return (
    <footer className="w-full border-t border-divider bg-bg-page/60 backdrop-blur-sm py-6 text-center text-xs text-secondary-text mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-gradient-soft font-bold">{appName}</span>
          <span className="opacity-40">·</span>
          <span>&copy; {currentYear} All rights reserved.</span>
        </div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-primary-text transition-colors">
            Terms of Service
          </Link>
          <span className="opacity-30">•</span>
          <Link href="/privacy" className="hover:text-primary-text transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
