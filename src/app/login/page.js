"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FaInfoCircle } from "react-icons/fa";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { Spotlight } from "@/components/ui/spotlight-new";
import config from "@/lib/config";

const appName = config?.appName || "UGCast";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("callbackUrl") || searchParams.get("next") || "/";

  useEffect(() => {
    if (status === "authenticated") {
      router.push(next);
    }
  }, [status, router, next]);

  return (
    <AuroraBackground className="min-h-dvh px-6 text-primary-text select-none">
      <Spotlight />
      <div className="relative glass-panel w-full max-w-md rounded-2xl p-8 space-y-8 shadow-2xl animate-scale-up z-10">
        <div className="flex flex-col items-center text-center space-y-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-tile.svg"
            alt={`${appName} logo`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-2xl glow-primary"
          />
          <h2 className="text-2xl font-black tracking-tight text-gradient-soft">Sign in to {appName}</h2>
          <p className="text-xs font-semibold text-secondary-text leading-relaxed px-4">
            Sign in with Google to enable predictions, save generation history, and top up credits packages.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signIn("google", { callbackUrl: next })}
            className="group w-full py-3.5 px-5 rounded-full text-xs font-bold flex items-center justify-center gap-3 cursor-pointer
                       bg-white/[0.04] text-primary-text border border-glass-border
                       backdrop-blur-md transition-all duration-200
                       hover:bg-white/[0.07] hover:border-primary-500/40 hover:shadow-[0_8px_30px_-8px_var(--color-primary)]
                       active:scale-[0.98]"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-white shadow-sm">
              <svg className="w-[14px] h-[14px]" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
                <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
                <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
                <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
              </svg>
            </span>
            <span className="tracking-wide">Continue with Google</span>
          </button>
        </div>

        <div className="flex items-start gap-2.5 bg-primary-500/10 border border-primary-500/20 p-3.5 rounded-xl text-[11px] leading-relaxed text-secondary-text">
          <FaInfoCircle className="text-primary-300 text-xs shrink-0 mt-0.5" />
          <span>
            By signing in, you agree to our Terms of Service. Purchases are stripe-secured and credit balance addition is automated.
          </span>
        </div>
      </div>
    </AuroraBackground>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center bg-bg-page text-primary-text">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
