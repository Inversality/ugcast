"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiKey, FiPlus, FiTrash2, FiLoader, FiCopy, FiCheck, FiX, FiCode } from "react-icons/fi";

export default function DevelopersPage() {
  const { data: session, status } = useSession();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [revealed, setRevealed] = useState(null); // freshly created raw key
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const load = async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) setKeys(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) load();
  }, [session]);

  const createKey = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName || "API key" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRevealed(data.key);
      setNewName("");
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id) => {
    if (!confirm("Revoke this key? Apps using it will stop working.")) return;
    const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
    if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (status === "loading") return null;
  if (!session) return null;

  const curl = `curl -X POST https://your-app.com/api/v1/generate \\
  -H "x-api-key: oau_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "modelId": "ai-avatar-v2-pro",
    "actorIds": ["<actorId>"],
    "script": "I never thought a sleep gummy could change my mornings...",
    "voiceId": "olivia",
    "emotion": "friendly",
    "settings": { "aspect_ratio": "9:16" }
  }'`;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
      <header className="max-w-4xl mx-auto mb-8 space-y-2">
        <div className="flex items-center gap-3 text-muted">
          <FiCode className="text-xs" />
          <span className="text-xs font-bold uppercase tracking-widest">Developers</span>
        </div>
        <h1 className="text-2xl font-black text-foreground">API KEYS</h1>
        <p className="text-muted font-medium text-xs leading-loose max-w-xl">
          Generate UGC videos programmatically. Keys carry your account&apos;s credits — keep them secret.
        </p>
      </header>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Create */}
        <div className="rounded-xl border border-glass-border bg-glass-bg/40 p-5 flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted">New key name</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Production server"
              className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-xs font-bold text-foreground placeholder-muted outline-none focus:border-primary-500/50 transition-colors" />
          </div>
          <button onClick={createKey} disabled={creating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs disabled:opacity-50 glow-primary transition-all">
            {creating ? <FiLoader className="animate-spin" /> : <FiPlus />} Create key
          </button>
        </div>

        {/* Keys list */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center"><FiLoader className="text-2xl text-primary-300 animate-spin" /></div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-glass-border p-8 text-center">
              <FiKey className="text-2xl text-muted/60 mx-auto mb-2" />
              <p className="text-xs font-medium text-muted">No API keys yet.</p>
            </div>
          ) : (
            keys.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-lg border border-glass-border bg-solid-bg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded bg-glass-hover flex items-center justify-center"><FiKey className="text-muted text-sm" /></div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{k.name}</p>
                    <p className="text-[11px] text-muted font-mono">{k.prefix}••••••••</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[10px] text-muted hidden sm:block">
                    {k.lastUsedAt ? `Used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "Never used"}
                  </span>
                  <button onClick={() => revoke(k.id)} className="p-2 rounded-full hover:bg-rose-500/10 text-rose-500"><FiTrash2 className="text-sm" /></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Usage docs */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted">Quickstart</h2>
          <pre className="rounded-xl bg-black/50 border border-glass-border text-primary-200 text-[11px] leading-relaxed p-4 overflow-x-auto font-mono custom-scrollbar">{curl}</pre>
          <p className="text-[11px] text-muted">
            List available actors with <span className="font-mono text-foreground">GET /api/v1/actors</span> (same{" "}
            <span className="font-mono text-foreground">x-api-key</span> header). The response&apos;s{" "}
            <span className="font-mono text-foreground">creations[].id</span> can be polled at{" "}
            <span className="font-mono text-foreground">/api/creations/&lt;id&gt;</span>.
          </p>
        </div>
      </div>

      {/* One-time reveal modal */}
      <AnimatePresence>
        {revealed && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-bg-card border border-glass-border rounded-2xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Your new API key</h3>
                <button onClick={() => setRevealed(null)} className="p-1 hover:bg-glass-hover rounded-full"><FiX className="text-muted" /></button>
              </div>
              <p className="text-[11px] font-bold text-rose-400">Copy it now — you won&apos;t be able to see it again.</p>
              <div className="flex items-center gap-2 bg-glass-bg border border-glass-border rounded-lg p-3">
                <code className="flex-1 text-[11px] font-mono text-primary-200 break-all">{revealed}</code>
                <button onClick={() => copy(revealed)} className="p-2 rounded-lg hover:bg-glass-hover text-muted">
                  {copied ? <FiCheck className="text-emerald-400" /> : <FiCopy />}
                </button>
              </div>
              <button onClick={() => setRevealed(null)} className="w-full py-2.5 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs glow-primary transition-all">
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
