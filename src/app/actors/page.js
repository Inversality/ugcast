"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus, FiUser, FiX, FiLoader, FiTrash2, FiUploadCloud, FiZap, FiStar,
} from "react-icons/fi";

const GENDERS = ["female", "male", "non-binary"];
const AGES = ["20s", "30s", "40s", "50s"];
const SETTINGS = ["bedroom", "kitchen", "living room", "office", "outdoor", "studio", "car", "bathroom", "gym"];

export default function ActorsPage() {
  const { data: session, status } = useSession();
  const [actors, setActors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMode, setModalMode] = useState(null); // "generate" | "upload" | null
  const [busy, setBusy] = useState(false);

  // form state
  const [form, setForm] = useState({ name: "", description: "", gender: "female", ageRange: "20s", setting: "studio" });
  const [uploadUrl, setUploadUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const loadActors = async () => {
    try {
      const res = await fetch("/api/actors");
      if (res.ok) setActors(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) loadActors();
  }, [session]);

  const resetForm = () => {
    setForm({ name: "", description: "", gender: "female", ageRange: "20s", setting: "studio" });
    setUploadUrl(null);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadUrl(data.url);
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/actors/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate actor");
      setActors((prev) => [data, ...prev]);
      setModalMode(null);
      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveUpload = async () => {
    if (!uploadUrl) return;
    setBusy(true);
    try {
      const res = await fetch("/api/actors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl: uploadUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save actor");
      setActors((prev) => [data, ...prev]);
      setModalMode(null);
      resetForm();
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this actor?")) return;
    try {
      const res = await fetch(`/api/actors/${id}`, { method: "DELETE" });
      if (res.ok) setActors((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (status === "loading") return null;
  if (!session) return null;

  const stock = actors.filter((a) => a.isStock);
  const mine = actors.filter((a) => !a.isStock);

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-muted">
            <FiUser className="text-xs" />
            <span className="text-xs font-bold uppercase tracking-widest">Actor Library</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">AI ACTORS</h1>
          <p className="text-muted font-medium text-xs leading-loose max-w-xl">
            Pick a reusable actor for your UGC ads, save your own persona, or generate a brand-new AI face.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { resetForm(); setModalMode("upload"); }}
            className="flex items-center gap-2 px-5 py-3 rounded-full border border-glass-border bg-glass-bg hover:bg-glass-hover text-foreground font-bold text-xs transition-all"
          >
            <FiUploadCloud /> Save my own
          </button>
          <button
            onClick={() => { resetForm(); setModalMode("generate"); }}
            className="flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs glow-primary shadow-lg shadow-primary-500/20 transition-all"
          >
            <FiZap /> Generate actor
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="py-32 flex flex-col items-center justify-center gap-4">
          <FiLoader className="text-3xl text-primary-300 animate-spin" />
          <span className="text-xs font-medium text-muted animate-pulse">Loading actors...</span>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto space-y-12">
          <Section title="My Actors" icon={<FiUser className="text-xs" />} count={mine.length}>
            {mine.length === 0 ? (
              <EmptyHint text="No saved actors yet — generate one or save your own face/product image." />
            ) : (
              <ActorGrid actors={mine} onDelete={handleDelete} />
            )}
          </Section>

          <Section title="Stock Actors" icon={<FiStar className="text-xs" />} count={stock.length}>
            {stock.length === 0 ? (
              <EmptyHint text="No stock actors seeded. Run `npm run seed:actors` to generate the starter roster." />
            ) : (
              <ActorGrid actors={stock} />
            )}
          </Section>
        </div>
      )}

      {/* Create / Generate Modal */}
      <AnimatePresence>
        {modalMode && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !busy && setModalMode(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-bg-card border border-glass-border rounded-2xl shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">
                  {modalMode === "generate" ? "Generate AI Actor" : "Save Your Actor"}
                </h3>
                <button onClick={() => !busy && setModalMode(null)} className="p-1 hover:bg-glass-hover rounded-full">
                  <FiX className="text-muted" />
                </button>
              </div>

              {modalMode === "upload" && (
                <div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-full aspect-[3/4] max-h-52 mx-auto rounded-lg border-2 border-dashed border-glass-border flex flex-col items-center justify-center gap-2 text-muted hover:border-primary-500/50 hover:text-primary-500 transition-all overflow-hidden"
                  >
                    {uploading ? (
                      <FiLoader className="text-2xl animate-spin" />
                    ) : uploadUrl ? (
                      <img src={uploadUrl} className="w-full h-full object-cover" alt="actor" />
                    ) : (
                      <>
                        <FiUploadCloud className="text-2xl" />
                        <span className="text-xs font-bold">Upload a face / product</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Maya"
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-xs font-bold text-foreground placeholder-muted outline-none focus:border-primary-500/50"
                />
              </Field>

              <Field label={modalMode === "generate" ? "Persona description" : "Notes (optional)"}>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder={modalMode === "generate" ? "warm, expressive, casual hoodie, friendly smile" : ""}
                  rows={2}
                  className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-xs font-bold text-foreground placeholder-muted outline-none focus:border-primary-500/50 resize-none"
                />
              </Field>

              <div className="grid grid-cols-3 gap-2">
                <SelectField label="Gender" value={form.gender} options={GENDERS} onChange={(v) => setForm({ ...form, gender: v })} />
                <SelectField label="Age" value={form.ageRange} options={AGES} onChange={(v) => setForm({ ...form, ageRange: v })} />
                <SelectField label="Setting" value={form.setting} options={SETTINGS} onChange={(v) => setForm({ ...form, setting: v })} />
              </div>

              {modalMode === "generate" ? (
                <button
                  onClick={handleGenerate}
                  disabled={busy}
                  className="w-full py-3 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs glow-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy ? <FiLoader className="animate-spin" /> : <FiZap />}
                  {busy ? "Generating face..." : "Generate (30 credits)"}
                </button>
              ) : (
                <button
                  onClick={handleSaveUpload}
                  disabled={busy || !uploadUrl || !form.name}
                  className="w-full py-3 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs glow-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {busy ? <FiLoader className="animate-spin" /> : <FiPlus />}
                  Save Actor
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, count, children }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-muted">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{title}</span>
        <span className="text-xs font-bold text-muted/60">({count})</span>
      </div>
      {children}
    </section>
  );
}

function ActorGrid({ actors, onDelete }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {actors.map((actor) => (
        <motion.div
          key={actor.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="group relative rounded-lg overflow-hidden border border-glass-border bg-solid-bg aspect-[3/4] shadow-sm hover:shadow-xl transition-all"
        >
          <img src={actor.imageUrl} alt={actor.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
            <p className="text-white text-xs font-bold truncate">{actor.name}</p>
            <p className="text-white/70 text-[10px] truncate capitalize">
              {[actor.ageRange, actor.gender, actor.setting].filter(Boolean).join(" · ")}
            </p>
          </div>
          {onDelete && (
            <button
              onClick={() => onDelete(actor.id)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 hover:bg-rose-500 backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
            >
              <FiTrash2 className="text-xs" />
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <div className="rounded-lg border border-dashed border-glass-border p-8 text-center">
      <p className="text-xs font-medium text-muted">{text}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</label>
      {children}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-2 bg-glass-bg border border-glass-border rounded-lg text-xs font-bold text-foreground placeholder-muted outline-none focus:border-primary-500/50 capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
