"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FiPlus, FiLoader, FiFilm, FiClock, FiCheckCircle, FiAlertCircle, FiTrash2 } from "react-icons/fi";

export default function EditorListPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") signIn();
  }, [status]);

  const load = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) setProjects(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) load();
  }, [session]);

  const create = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled ad" }),
      });
      const data = await res.json();
      if (res.ok) router.push(`/editor/${data.id}`);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this project?")) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) setProjects((p) => p.filter((x) => x.id !== id));
  };

  if (status === "loading") return null;
  if (!session) return null;

  const statusIcon = (s) =>
    s === "completed" ? <FiCheckCircle className="text-emerald-500" /> :
    s === "rendering" ? <FiLoader className="text-primary-400 animate-spin" /> :
    s === "failed" ? <FiAlertCircle className="text-rose-500" /> :
    <FiClock className="text-muted" />;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-12">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-muted">
            <FiFilm className="text-xs" />
            <span className="text-xs font-bold uppercase tracking-widest">Ad Editor</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">MULTI-SCENE ADS</h1>
          <p className="text-muted font-medium text-xs leading-loose max-w-xl">
            Stitch your generated clips into one ad — add captions, music, and transitions, then render a final MP4.
          </p>
        </div>
        <button onClick={create} disabled={creating}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-sm glow-primary disabled:opacity-50 transition-all">
          {creating ? <FiLoader className="animate-spin" /> : <FiPlus />} New ad
        </button>
      </header>

      <div className="max-w-6xl mx-auto">
        {loading ? (
          <div className="py-24 flex justify-center"><FiLoader className="text-3xl text-primary-300 animate-spin" /></div>
        ) : projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-glass-border p-12 text-center space-y-3">
            <FiFilm className="text-3xl text-muted/60 mx-auto" />
            <p className="text-xs font-medium text-muted">No ads yet. Create one to start composing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => router.push(`/editor/${p.id}`)}
                className="group relative rounded-xl border border-glass-border bg-solid-bg overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className="aspect-video bg-black flex items-center justify-center">
                  {p.outputUrl ? (
                    <video src={p.outputUrl} className="w-full h-full object-cover" muted />
                  ) : (
                    <FiFilm className="text-3xl text-muted" />
                  )}
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{p.title}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                      {statusIcon(p.status)} {p.status}
                    </div>
                  </div>
                  <button onClick={(e) => remove(e, p.id)} className="p-2 rounded-full hover:bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiTrash2 className="text-sm" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
