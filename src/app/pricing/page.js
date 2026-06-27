"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import Footer from "@/components/Footer";
import { FaCheck, FaInfoCircle } from "react-icons/fa";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { SUBSCRIPTIONS, TOPUPS } from "@/lib/pricing";

const usd = (cents) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export default function Pricing() {
  const { status } = useSession();
  const [interval, setInterval] = useState("month");
  const [loading, setLoading] = useState(null);

  const requireAuth = () => {
    if (status !== "authenticated") {
      toast.error("You must sign in with Google to subscribe.");
      return false;
    }
    return true;
  };

  const handleSubscribe = async (planId) => {
    if (!requireAuth()) return;
    setLoading(`sub-${planId}`);
    try {
      const { data } = await axios.post("/api/checkout/subscription", { planId, interval });
      if (data.url) window.location.href = data.url;
      else throw new Error("No redirection URL returned");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start checkout.");
    } finally {
      setLoading(null);
    }
  };

  const handleTopup = async (planId) => {
    if (!requireAuth()) return;
    setLoading(`top-${planId}`);
    try {
      const { data } = await axios.post("/api/checkout", { planId });
      if (data.url) window.location.href = data.url;
      else throw new Error("No redirection URL returned");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to start checkout.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-bg-page select-none text-foreground overflow-hidden">
      <Toaster position="top-right" />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col gap-12 overflow-y-auto scrollbar-subtle items-center">
        {/* Heading */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full mb-1">
            <FaInfoCircle className="text-primary-500 text-xs" />
            <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Plans &amp; Pricing</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase text-gradient">Pick a plan that scales with you</h1>
          <p className="text-xs sm:text-sm text-muted max-w-lg leading-relaxed">
            Credits refresh every cycle and power every model. Bigger, pricier models (Veo 3.1) cost more credits;
            fast models (Grok, avatars) cost far less — you only burn what you use.
          </p>
        </div>

        {/* Monthly / Yearly toggle */}
        <div className="inline-flex items-center gap-1 p-1 rounded-full glass-panel border border-glass-border">
          {[
            { id: "month", label: "Monthly" },
            { id: "year", label: "Yearly" },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setInterval(opt.id)}
              className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
                interval === opt.id ? "bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page glow-primary" : "text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
          <span className="px-3 text-[10px] font-black text-primary-500 uppercase tracking-wider">2 months free</span>
        </div>

        {/* Subscription tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {SUBSCRIPTIONS.map((plan) => {
            const price = interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
            const perMonth = interval === "year" ? plan.yearlyPrice / 12 : plan.monthlyPrice;
            return (
              <div
                key={plan.id}
                className={`relative bg-bg-card border rounded-2xl p-6 flex flex-col justify-between gap-6 transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular ? "border-primary-500/60 glow-primary scale-105" : "border-glass-border hover:border-primary-500/30"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page text-[9px] font-black uppercase px-3 py-1 rounded-full tracking-wider glow-primary">
                    Most Popular
                  </span>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-extrabold uppercase tracking-wide text-foreground">{plan.name}</h3>
                    <p className="text-[11px] text-muted">{plan.target}</p>
                  </div>

                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black tracking-tight text-foreground">{usd(perMonth)}</span>
                    <span className="text-xs text-muted mb-1">/mo</span>
                  </div>
                  <p className="text-[11px] text-muted -mt-2">
                    {interval === "year" ? `Billed ${usd(price)} yearly` : "Billed monthly"}
                  </p>

                  <div className="text-xs bg-bg-page/50 border border-divider/30 p-3 rounded text-center font-extrabold text-primary-500">
                    {plan.monthlyCredits.toLocaleString()} credits / month
                  </div>

                  <ul className="space-y-2 border-t border-divider/30 pt-4 text-xs font-medium text-muted">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <FaCheck className="text-primary-500 text-[10px] mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                  className={`w-full py-3 rounded-full text-xs font-bold transition-all shadow-md cursor-pointer select-none active:scale-[0.98] ${
                    plan.popular ? "bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page hover:brightness-110 glow-primary" : "bg-bg-page hover:bg-bg-card text-foreground border border-divider"
                  }`}
                >
                  {loading === `sub-${plan.id}` ? "Loading checkout..." : `Get ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Top-up packs */}
        <div className="w-full max-w-5xl space-y-5">
          <div className="text-center space-y-1">
            <h2 className="text-lg font-black uppercase tracking-wide text-foreground">Need more? Top up anytime</h2>
            <p className="text-xs text-muted">One-time credit packs. They never expire and stack on top of your plan.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TOPUPS.map((pack) => (
              <div key={pack.id} className="bg-bg-card border border-glass-border rounded-xl p-5 flex flex-col items-center gap-3 text-center hover:border-primary-500/30 transition-all">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{pack.credits.toLocaleString()} credits</p>
                <p className="text-2xl font-black text-foreground">{usd(pack.price)}</p>
                <button
                  onClick={() => handleTopup(pack.id)}
                  disabled={loading !== null}
                  className="w-full py-2.5 rounded-full text-[11px] font-bold bg-bg-page hover:bg-bg-card text-foreground border border-divider transition-all active:scale-[0.98] cursor-pointer"
                >
                  {loading === `top-${pack.id}` ? "Loading..." : "Buy pack"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
