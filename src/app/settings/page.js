"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSettings, FiUser, FiMail, FiLoader, FiSave, FiAlertTriangle, FiX, FiAward, FiDroplet,
} from "react-icons/fi";
import toast, { Toaster } from "react-hot-toast";
import SettingsTabs from "@/components/SettingsTabs";
import ThemeSwitcher from "@/components/ThemeSwitcher";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  // `null` = mirror the session name; a string = the user has edited the field.
  const [name, setName] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  if (status === "loading") return null;
  if (!session) return null;

  const user = session.user;
  const nameValue = name ?? (user.name || "");
  const dirty = nameValue.trim() && nameValue.trim() !== (user.name || "");

  const saveProfile = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Update failed");
      await update(); // refresh the session so the new name shows everywhere
      setName(null); // re-sync the field with the (now updated) session name
      toast.success("Profile updated.");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      toast.success("Account deleted. Signing you out…");
      setTimeout(() => signOut({ callbackUrl: "/" }), 1200);
    } catch (e) {
      toast.error(e.message);
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
      <Toaster position="top-right" />

      <header className="max-w-3xl mx-auto mb-8 space-y-4">
        <div className="flex items-center gap-3 text-muted">
          <FiSettings className="text-xs" />
          <span className="text-xs font-bold uppercase tracking-widest">Account</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">SETTINGS</h1>
        <SettingsTabs />
      </header>

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Profile */}
        <section className="rounded-2xl border border-glass-border bg-bg-card p-6 space-y-6">
          <div className="flex items-center gap-4">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="Avatar" className="h-16 w-16 rounded-full object-cover border border-glass-border" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-bg-page text-xl font-black">
                {(user.name || user.email || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <p className="text-base font-black text-foreground">{user.name || "Unnamed creator"}</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-glass-bg border border-glass-border text-muted">
                  {user.plan ? `${user.plan} plan` : "Free plan"}
                </span>
                {user.unlimited && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-300">
                    <FiAward className="text-[10px]" /> Founder · Unlimited
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t border-divider/40 pt-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                <FiUser className="text-[11px]" /> Display name
              </label>
              <input
                value={nameValue}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                placeholder="Your name"
                className="w-full px-3 py-2.5 bg-glass-bg border border-glass-border rounded-lg text-sm font-semibold text-foreground placeholder-muted outline-none focus:border-primary-500/50 transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-1.5">
                <FiMail className="text-[11px]" /> Email
              </label>
              <input
                value={user.email || ""}
                disabled
                className="w-full px-3 py-2.5 bg-bg-page/50 border border-glass-border rounded-lg text-sm font-semibold text-muted outline-none cursor-not-allowed"
              />
              <p className="text-[10px] text-muted/70">Managed by your Google sign-in — can&apos;t be changed here.</p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveProfile}
                disabled={!dirty || saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs disabled:opacity-40 disabled:pointer-events-none glow-primary transition-all"
              >
                {saving ? <FiLoader className="animate-spin" /> : <FiSave />} Save changes
              </button>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="rounded-2xl border border-glass-border bg-bg-card p-6 space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted">
              <FiDroplet className="text-sm" />
              <h2 className="text-xs font-black uppercase tracking-widest">Appearance</h2>
            </div>
            <p className="text-[11px] text-muted">Pick a theme — saved on this device and applied instantly.</p>
          </div>
          <ThemeSwitcher />
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.03] p-6 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <FiAlertTriangle className="text-sm" />
            <h2 className="text-xs font-black uppercase tracking-widest">Danger zone</h2>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-muted leading-relaxed max-w-md">
              Permanently delete your account, creations, actors, projects and API keys.
              This cannot be undone.
            </p>
            <button
              onClick={() => setConfirmDelete(true)}
              className="shrink-0 px-5 py-2.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all"
            >
              Delete account
            </button>
          </div>
        </section>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !deleting && setConfirmDelete(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-bg-card border border-rose-500/30 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Delete account?</h3>
                <button onClick={() => !deleting && setConfirmDelete(false)} className="p-1 hover:bg-glass-hover rounded-full">
                  <FiX className="text-muted" />
                </button>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                This will permanently erase everything tied to{" "}
                <span className="font-bold text-foreground">{user.email}</span>. Any active subscription
                is cancelled. This action is irreversible.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 py-2.5 rounded-full bg-glass-bg hover:bg-glass-hover text-foreground border border-glass-border font-bold text-xs transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={deleting}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition-all disabled:opacity-50"
                >
                  {deleting ? <FiLoader className="animate-spin" /> : <FiAlertTriangle />} Delete forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
