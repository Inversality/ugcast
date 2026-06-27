"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCreditCard, FiLoader, FiZap, FiRefreshCw, FiExternalLink, FiPlus,
  FiCalendar, FiAward, FiArrowUpRight, FiX, FiAlertTriangle, FiFileText, FiDownload,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";
import SettingsTabs from "@/components/SettingsTabs";
import { getSubscription } from "@/lib/pricing";

const usd = (cents) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : null;

const STATUS_STYLES = {
  active: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  past_due: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  canceled: "bg-rose-500/15 border-rose-500/30 text-rose-300",
};

const INVOICE_STATUS_STYLES = {
  paid: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  open: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  uncollectible: "bg-rose-500/15 border-rose-500/30 text-rose-300",
  void: "bg-glass-bg border-glass-border text-muted",
  draft: "bg-glass-bg border-glass-border text-muted",
};

export default function BillingPage() {
  const { status } = useSession();
  const [data, setData] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // "portal" | "cancel"
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [canceledInSession, setCanceledInSession] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const load = async () => {
    try {
      const [billingRes, invoicesRes] = await Promise.all([
        fetch("/api/billing"),
        fetch("/api/billing/invoices"),
      ]);
      if (billingRes.ok) setData(await billingRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") load();
  }, [status]);

  const openPortal = async () => {
    setBusy("portal");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't open billing portal");
      window.location.href = json.url;
    } catch (e) {
      toast.error(e.message);
      setBusy(null);
    }
  };

  const cancelPlan = async () => {
    setBusy("cancel");
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't cancel subscription");
      setCanceledInSession(true);
      setConfirmCancel(false);
      toast.success("Your plan will cancel at the end of the billing period.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (status === "loading" || status === "unauthenticated") return null;

  const plan = data?.plan ? getSubscription(data.plan) : null;
  const interval = data?.planInterval || "month";
  const planPrice = plan ? (interval === "year" ? plan.yearlyPrice : plan.monthlyPrice) : 0;
  const perMonth = plan ? (interval === "year" ? plan.yearlyPrice / 12 : plan.monthlyPrice) : 0;
  const isActive = data?.planStatus === "active";
  const renewal = fmtDate(data?.currentPeriodEnd) || fmtDate(data?.creditsRefreshAt);
  const fmtCredits = (n) => (data?.unlimited ? "∞" : (n || 0).toLocaleString());

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
      <Toaster position="top-right" />

      <header className="max-w-3xl mx-auto mb-8 space-y-4">
        <div className="flex items-center gap-3 text-muted">
          <FiCreditCard className="text-xs" />
          <span className="text-xs font-bold uppercase tracking-widest">Account</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">BILLING</h1>
        <SettingsTabs />
      </header>

      {loading ? (
        <div className="py-24 flex justify-center"><FiLoader className="text-2xl text-primary-300 animate-spin" /></div>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Founder banner */}
          {data?.unlimited && (
            <div className="rounded-2xl border border-primary-500/30 bg-primary-500/[0.06] p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-bg-page shrink-0">
                <FiAward />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">Founder account · Unlimited usage</p>
                <p className="text-xs text-muted">You&apos;re never charged credits and never hit a limit. Billing controls below are optional.</p>
              </div>
            </div>
          )}

          {/* Current plan */}
          <section className="rounded-2xl border border-glass-border bg-bg-card p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Current plan</p>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-black text-foreground">{plan ? plan.name : "Free"}</h2>
                  {data?.planStatus && (
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[data.planStatus] || "bg-glass-bg border-glass-border text-muted"}`}>
                      {data.planStatus.replace("_", " ")}
                    </span>
                  )}
                </div>
                {plan ? (
                  <p className="text-xs text-muted">
                    {usd(perMonth)}/mo · {interval === "year" ? `billed ${usd(planPrice)} yearly` : "billed monthly"}
                  </p>
                ) : (
                  <p className="text-xs text-muted">No active subscription — choose a plan or buy a top-up pack to get credits.</p>
                )}
              </div>
              {plan && (
                <span className="text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-glass-bg border border-glass-border text-muted shrink-0">
                  {interval === "year" ? "Yearly" : "Monthly"}
                </span>
              )}
            </div>

            {(renewal || canceledInSession) && (
              <div className="flex items-center gap-2 text-xs text-muted border-t border-divider/40 pt-4">
                <FiCalendar className="text-[12px]" />
                {canceledInSession ? (
                  <span className="text-rose-300 font-semibold">Cancels at the end of the current period{renewal ? ` (${renewal})` : ""}.</span>
                ) : isActive ? (
                  <span>Renews on <span className="font-bold text-foreground">{renewal}</span></span>
                ) : (
                  <span>Credits refresh on <span className="font-bold text-foreground">{renewal}</span></span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs glow-primary transition-all"
              >
                {plan ? <><FiArrowUpRight /> Change plan</> : <><FiZap /> Choose a plan</>}
              </Link>

              {data?.hasStripeCustomer && (
                <button
                  onClick={openPortal}
                  disabled={busy === "portal"}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-glass-bg hover:bg-glass-hover text-foreground border border-glass-border font-bold text-xs transition-all disabled:opacity-50"
                >
                  {busy === "portal" ? <FiLoader className="animate-spin" /> : <FiExternalLink />} Manage billing & invoices
                </button>
              )}

              {data?.hasSubscription && !canceledInSession && (
                <button
                  onClick={() => setConfirmCancel(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 font-bold text-xs transition-all"
                >
                  Cancel plan
                </button>
              )}
            </div>
          </section>

          {/* Credits */}
          <section className="rounded-2xl border border-glass-border bg-bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Credit balance</p>
              <Link href="/pricing" className="flex items-center gap-1.5 text-[11px] font-bold text-primary-300 hover:text-primary-200 transition-colors">
                <FiPlus className="text-[11px]" /> Buy credits
              </Link>
            </div>

            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-gradient leading-none">{fmtCredits(data?.total)}</span>
              <span className="text-xs text-muted mb-1 font-semibold">credits total</span>
            </div>

            {!data?.unlimited && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-glass-border bg-glass-bg/40 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted">
                    <FiRefreshCw className="text-[11px]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Monthly allowance</span>
                  </div>
                  <p className="text-lg font-black text-foreground">{(data?.credits || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted">
                    {data?.monthlyCredits ? `${data.monthlyCredits.toLocaleString()} / cycle · ` : ""}
                    resets each cycle (unused expires)
                  </p>
                </div>
                <div className="rounded-xl border border-glass-border bg-glass-bg/40 p-4 space-y-1">
                  <div className="flex items-center gap-1.5 text-muted">
                    <FiZap className="text-[11px]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Top-up credits</span>
                  </div>
                  <p className="text-lg font-black text-foreground">{(data?.topupCredits || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-muted">One-time packs · never expire</p>
                </div>
              </div>
            )}
          </section>

          {/* Invoices / payment history */}
          {invoices.length > 0 && (
            <section className="rounded-2xl border border-glass-border bg-bg-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <FiFileText className="text-sm text-muted" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Invoices</p>
              </div>

              <div className="divide-y divide-divider/40">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {usd(inv.amount)} <span className="text-muted font-medium">{(inv.currency || "usd").toUpperCase()}</span>
                      </p>
                      <p className="text-[11px] text-muted truncate">
                        {fmtDate(inv.created) || "—"}
                        {inv.number ? ` · #${inv.number}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${INVOICE_STATUS_STYLES[inv.status] || "bg-glass-bg border-glass-border text-muted"}`}>
                        {inv.status}
                      </span>
                      {inv.pdf ? (
                        <a href={inv.pdf} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-full hover:bg-glass-hover text-muted hover:text-foreground transition-colors" title="Download PDF">
                          <FiDownload className="text-sm" />
                        </a>
                      ) : inv.hostedUrl ? (
                        <a href={inv.hostedUrl} target="_blank" rel="noopener noreferrer"
                          className="p-2 rounded-full hover:bg-glass-hover text-muted hover:text-foreground transition-colors" title="View invoice">
                          <FiExternalLink className="text-sm" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Cancel confirmation modal */}
      <AnimatePresence>
        {confirmCancel && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => busy !== "cancel" && setConfirmCancel(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-card border border-glass-border rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Cancel subscription?</h3>
                <button onClick={() => busy !== "cancel" && setConfirmCancel(false)} className="p-1 hover:bg-glass-hover rounded-full">
                  <FiX className="text-muted" />
                </button>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Your plan stays active until the end of the current billing period{renewal ? ` (${renewal})` : ""}.
                After that you won&apos;t be charged again and your monthly allowance stops refreshing. Any
                top-up credits you&apos;ve purchased remain.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmCancel(false)}
                  disabled={busy === "cancel"}
                  className="flex-1 py-2.5 rounded-full bg-glass-bg hover:bg-glass-hover text-foreground border border-glass-border font-bold text-xs transition-all disabled:opacity-50"
                >
                  Keep plan
                </button>
                <button
                  onClick={cancelPlan}
                  disabled={busy === "cancel"}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-rose-500/90 hover:bg-rose-500 text-white font-bold text-xs transition-all disabled:opacity-50"
                >
                  {busy === "cancel" ? <FiLoader className="animate-spin" /> : <FiAlertTriangle />} Confirm cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
