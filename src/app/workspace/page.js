"use client";

import { useSession } from "next-auth/react";
import {
  FiArrowUp, FiVideo, FiX, FiSearch, FiChevronDown, FiZap, FiImage, FiPlus,
  FiLoader, FiTrash2, FiUser, FiEdit3, FiGlobe, FiAlertCircle, FiUsers, FiGrid,
  FiSliders, FiSmile, FiMoreHorizontal, FiFolder,
} from "react-icons/fi";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaCoins } from "react-icons/fa";
import { useRouter } from "next/navigation";
import {
  MODELS, VOICES, EMOTIONS, LANGUAGES, TEMPLATES, applyTemplate,
  defaultSettings, totalGenerationCost,
} from "@/lib/muapi";
import { Spotlight } from "@/components/ui/spotlight-new";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { ShimmerBadge } from "@/components/ui/aceternity";
import { AmbientField } from "@/components/ui/ambient-field";

const ICONS = { FiVideo, FiZap, FiUser };
const iconFor = (name) => ICONS[name] || FiVideo;

const MAX_SCRIPT = 1500;

// Top-level generation modes shown as segmented tabs above the composer. Each
// maps to a model category; "image" has no model yet so it opens the browser.
const MODES = [
  { id: "talking-avatar", label: "Talking Actors", icon: FiUser },
  { id: "video", label: "Video", icon: FiVideo },
  { id: "image", label: "Image", icon: FiImage },
];

function CustomDropdown({ label, value, options, onChange, unit = "", icon: Icon = null }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  return (
    <div ref={containerRef} className="relative"
      onBlur={(e) => { if (!containerRef.current.contains(e.relatedTarget)) setIsOpen(false); }}>
      <button onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all hover:bg-glass-hover ${isOpen ? "bg-glass-hover" : ""}`}>
        {Icon && <Icon className="text-xs text-muted" />}
        {label && <span className="text-xs font-medium text-muted capitalize">{label}</span>}
        <span className="text-xs font-medium text-foreground">{value}{unit}</span>
        <FiChevronDown className={`text-xs text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 max-h-60 overflow-y-auto glass-dropdown rounded-lg shadow-[0_24px_60px_rgba(0,0,0,0.6)] z-[10000]">
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setIsOpen(false); }}
              className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-glass-hover transition-colors whitespace-nowrap ${opt === value ? "text-foreground bg-glass-bg" : "text-muted"}`}>
              {opt}{unit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RangeParameter({ label, value, min, max, unit = "", onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  return (
    <div ref={containerRef} className="relative"
      onBlur={(e) => { if (!containerRef.current.contains(e.relatedTarget)) setIsOpen(false); }}>
      <button onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1 rounded transition-all hover:bg-glass-hover ${isOpen ? "bg-glass-hover" : ""}`}>
        <span className="text-xs font-medium text-muted">{label}</span>
        <span className="text-xs font-medium text-foreground">{value}{unit}</span>
        <FiChevronDown className={`text-xs text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-56 glass-dropdown rounded-lg shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-5 z-[10000]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-muted">{label}</span>
            <span className="text-xs font-medium text-foreground">{value}{unit}</span>
          </div>
          <input type="range" min={min} max={max} value={value}
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-1.5 bg-glass-hover rounded-full appearance-none cursor-pointer accent-primary-500" />
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { status } = useSession();
  const router = useRouter();

  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [modelSettings, setModelSettings] = useState({});
  const [isModelsModalOpen, setIsModelsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [prompt, setPrompt] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]);
  const fileInputRef = useRef(null);

  // Projects sidebar
  const [projects, setProjects] = useState([]);

  // Actor / voice state (talking-avatar)
  const [actors, setActors] = useState([]);
  const [selectedActorIds, setSelectedActorIds] = useState([]);
  const [isActorPickerOpen, setIsActorPickerOpen] = useState(false);
  const [voiceId, setVoiceId] = useState(VOICES[0].id);
  const [emotion, setEmotion] = useState("neutral");
  const [language, setLanguage] = useState("English");

  // AI tools
  const [aiPanel, setAiPanel] = useState(null); // "write" | "hooks" | null
  const [product, setProduct] = useState("");
  const [angle, setAngle] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [hooks, setHooks] = useState([]);
  const [selectedHooks, setSelectedHooks] = useState([]);

  const [results, setResults] = useState([]); // last generation(s)

  const isAvatar = selectedModel.category === "talking-avatar";

  // Poll active results
  useEffect(() => {
    const active = ["processing", "pending", "starting", "queued"];
    if (!results.some((r) => active.includes(r.status))) return;
    const interval = setInterval(async () => {
      const updated = await Promise.all(
        results.map(async (r) => {
          if (!active.includes(r.status)) return r;
          try {
            const res = await fetch(`/api/creations/${r.id}`);
            if (res.ok) return await res.json();
          } catch (e) { console.error(e); }
          return r;
        })
      );
      setResults(updated);
    }, 3000);
    return () => clearInterval(interval);
  }, [results]);

  // Default settings on model change
  useEffect(() => {
    setModelSettings(defaultSettings(selectedModel.id));
  }, [selectedModel]);

  // Load actors when an avatar model is selected
  useEffect(() => {
    if (isAvatar && actors.length === 0) {
      fetch("/api/actors").then((r) => r.ok && r.json()).then((d) => d && setActors(d)).catch(() => {});
    }
  }, [isAvatar]);

  // Load the user's projects for the sidebar
  useEffect(() => {
    if (status === "authenticated") {
      fetch("/api/projects").then((r) => r.ok && r.json()).then((d) => Array.isArray(d) && setProjects(d)).catch(() => {});
    }
  }, [status]);

  const createProject = async () => {
    try {
      const res = await fetch("/api/projects", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const p = await res.json();
      if (res.ok && p?.id) router.push(`/editor/${p.id}`);
    } catch (e) { console.error(e); }
  };

  const getCost = () => {
    const perVariant = totalGenerationCost(selectedModel.id, modelSettings);
    const variantCount = isAvatar
      ? Math.max(1, selectedActorIds.length || 1) * Math.max(1, selectedHooks.length || 1)
      : 1;
    return perVariant * Math.min(8, variantCount);
  };

  // Switch the active generation mode (segmented tab).
  const switchMode = (categoryId) => {
    const m = MODELS.find((x) => x.category === categoryId);
    if (m) setSelectedModel(m);
    else setIsModelsModalOpen(true); // e.g. "image" — no model yet
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (uploadedImages.length + files.length > 7) { alert("Maximum 7 images allowed."); return; }
    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9), file,
      preview: URL.createObjectURL(file), status: "uploading",
    }));
    setUploadedImages((prev) => [...prev, ...newImages]);
    for (const img of newImages) {
      try {
        const formData = new FormData();
        formData.append("file", img.file);
        const response = await fetch("/api/upload", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        setUploadedImages((prev) => prev.map((p) => p.id === img.id ? { ...p, status: "ready", url: data.url } : p));
      } catch (error) {
        console.error(error);
        setUploadedImages((prev) => prev.map((p) => p.id === img.id ? { ...p, status: "error" } : p));
      }
    }
  };

  const removeImage = (id) => setUploadedImages((prev) => prev.filter((img) => img.id !== id));

  const toggleActor = (id) =>
    setSelectedActorIds((prev) => prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]);

  // ── AI tools ───────────────────────────────────────────────────────────────
  const handleWrite = async () => {
    if (!product.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/script", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, angle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrompt(data.script);
      setAiPanel(null);
    } catch (e) { alert(e.message); } finally { setAiBusy(false); }
  };

  const handleHooks = async () => {
    if (!product.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/hooks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product, angle, count: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHooks(data.hooks || []);
    } catch (e) { alert(e.message); } finally { setAiBusy(false); }
  };

  const handleTranslate = async (targetLanguage) => {
    setLanguage(targetLanguage);
    if (targetLanguage === "English" || !prompt.trim()) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: prompt, targetLanguage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPrompt(data.script);
    } catch (e) { alert(e.message); } finally { setAiBusy(false); }
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const scriptsToUse = isAvatar && selectedHooks.length ? selectedHooks : null;
    if (!scriptsToUse && !prompt.trim()) return;
    if (uploadedImages.some((img) => img.status === "uploading")) {
      alert("Please wait for images to finish uploading."); return;
    }
    if (isAvatar && selectedActorIds.length === 0 && !uploadedImages.some((i) => i.status === "ready")) {
      alert("Pick an actor (or upload a face) for a talking-avatar video."); return;
    }

    setIsGenerating(true);
    try {
      const body = {
        modelId: selectedModel.id,
        settings: modelSettings,
        images: uploadedImages.filter((img) => img.status === "ready").map((img) => img.url),
      };
      if (isAvatar) {
        body.script = prompt;
        body.scripts = scriptsToUse;
        body.actorIds = selectedActorIds;
        body.voiceId = voiceId;
        body.emotion = emotion;
        body.language = language;
      } else {
        body.prompt = prompt;
      }

      const response = await fetch("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setResults((data.creations || []).map((c) => ({ id: c.id, status: "processing", prompt })));
      setPrompt("");
      setSelectedHooks([]);
      setHooks([]);
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="h-full w-full flex items-center justify-center bg-solid-bg">
        <FiLoader className="w-6 h-6 animate-spin text-muted" />
      </div>
    );
  }

  const updateSetting = (key, value) => setModelSettings((prev) => ({ ...prev, [key]: value }));

  const applyTemplatePreset = (name) => {
    const t = TEMPLATES.find((x) => x.name === name);
    if (!t) return;
    setTemplateName(name);
    setModelSettings((prev) => applyTemplate(selectedModel.id, t, prev));
    if (t.tone && !angle) setAngle(t.tone);
  };

  const active = ["processing", "pending", "starting", "queued"];

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Left project sidebar ──────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col border-r border-glass-border bg-bg-card/40 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">Workspace</span>
        </div>

        <button onClick={createProject}
          className="mx-3 mb-3 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page text-xs font-bold py-2 hover:brightness-110 transition-all glow-primary">
          <FiPlus className="text-sm" /> New project
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar px-2 pb-4 space-y-4">
          {/* Projects group */}
          <div>
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted">
                <FiFolder className="text-[11px]" /> Projects
              </span>
              <button onClick={createProject} className="p-0.5 rounded hover:bg-glass-hover text-muted hover:text-foreground transition-colors">
                <FiPlus className="text-xs" />
              </button>
            </div>
            <div className="space-y-0.5">
              {projects.length === 0 ? (
                <p className="px-2 py-2 text-[11px] text-muted/70 leading-relaxed">
                  No projects yet. Create one to assemble multi-scene ads.
                </p>
              ) : (
                projects.map((p) => (
                  <button key={p.id} onClick={() => router.push(`/editor/${p.id}`)}
                    className="group w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[13px] font-medium text-foreground/90 hover:bg-glass-hover transition-colors">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      p.status === "completed" ? "bg-primary-500" : p.status === "failed" ? "bg-rose-500" : "bg-muted/50"
                    }`} />
                    <span className="truncate">{p.title || "Untitled ad"}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main workspace ───────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative min-h-0">
        {/* Canvas */}
        <div className="flex-1 p-8 relative flex flex-col items-center justify-center overflow-y-auto overflow-x-hidden">
          <Spotlight />
          <div className="absolute inset-0 bg-grid pointer-events-none opacity-60" />
          <AmbientField />
          {results.length === 0 ? (
            <div className="relative flex flex-col items-center justify-center text-center space-y-5 max-w-md">
              <ShimmerBadge>UGCAST · Veo 3.1 · Seedance · Grok</ShimmerBadge>
              <div className="relative">
                <span className="beacon-ring rounded-2xl" />
                <span className="beacon-ring rounded-2xl" style={{ animationDelay: "1.75s" }} />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center glow-primary-lg animate-aura">
                  <FiVideo className="text-2xl text-bg-page" />
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-gradient-soft">
                Generate winning assets with<br /><span className="text-gradient">talking actors</span>, videos & more
              </h1>
              <TextGenerateEffect
                className="text-muted text-sm font-medium leading-relaxed max-w-sm"
                duration={0.6}
                words={
                  isAvatar
                    ? "Pick an actor, write or paste a script, choose a voice — and generate a lip-synced talking UGC ad."
                    : "Reference uploaded images using @image(n) — e.g. @image1 a sunset over the ocean."
                }
              />
            </div>
          ) : (
            <div className={`grid gap-4 w-full ${results.length > 1 ? "grid-cols-2 md:grid-cols-3 max-w-4xl" : "max-w-lg"}`}>
              {results.map((r) => (
                <motion.div key={r.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-[9/16] bg-glass-bg rounded-2xl border border-glass-border shadow-2xl overflow-hidden flex items-center justify-center">
                  {active.includes(r.status) ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                      <span className="text-[9px] font-black text-muted uppercase tracking-[0.2em] animate-pulse">{r.status}...</span>
                    </div>
                  ) : r.status === "failed" ? (
                    <div className="flex flex-col items-center gap-3 p-4 text-center">
                      <FiAlertCircle className="text-rose-500 text-3xl" />
                      <p className="text-[9px] text-muted">{r.error || "Failed"}</p>
                    </div>
                  ) : (
                    <video src={r.url} className="w-full h-full object-cover" autoPlay loop playsInline controls muted={results.length > 1} />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* AI panels */}
        <AnimatePresence>
          {aiPanel && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-44 left-1/2 -translate-x-1/2 z-50 w-full max-w-md glass-dropdown rounded-xl shadow-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-foreground">
                  {aiPanel === "write" ? "✨ Write with AI" : "🎣 Generate Hooks"}
                </span>
                <button onClick={() => setAiPanel(null)} className="p-1 hover:bg-glass-hover rounded-full"><FiX className="text-muted text-sm" /></button>
              </div>
              <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product / service (e.g. a collagen sleep gummy)"
                className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-xs font-bold text-foreground placeholder-muted outline-none focus:border-primary-500/50 transition-colors" />
              <input value={angle} onChange={(e) => setAngle(e.target.value)} placeholder="Angle / audience (optional)"
                className="w-full px-3 py-2 bg-glass-bg border border-glass-border rounded-lg text-xs font-bold text-foreground placeholder-muted outline-none focus:border-primary-500/50 transition-colors" />
              <button onClick={aiPanel === "write" ? handleWrite : handleHooks} disabled={aiBusy || !product.trim()}
                className="w-full py-2.5 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs flex items-center justify-center gap-2 disabled:opacity-50 glow-primary transition-all">
                {aiBusy ? <FiLoader className="animate-spin" /> : <FiZap />}
                {aiPanel === "write" ? "Write script" : "Generate hooks"}
              </button>

              {aiPanel === "hooks" && hooks.length > 0 && (
                <div className="space-y-1.5 max-h-44 overflow-y-auto pt-1">
                  {hooks.map((h, i) => {
                    const on = selectedHooks.includes(h);
                    return (
                      <button key={i}
                        onClick={() => setSelectedHooks((prev) => on ? prev.filter((x) => x !== h) : [...prev, h])}
                        className={`w-full text-left px-3 py-2 rounded text-[11px] font-medium leading-snug transition-all border ${on ? "bg-primary-500/10 border-primary-500/40 text-foreground" : "bg-glass-bg border-glass-border text-muted hover:border-primary-500/40"}`}>
                        {h}
                      </button>
                    );
                  })}
                  <p className="text-[10px] text-muted font-bold pt-1">
                    {selectedHooks.length} selected → generates {selectedHooks.length || 0} variant(s){selectedActorIds.length > 1 ? ` × ${selectedActorIds.length} actors` : ""}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Composer ─────────────────────────────────────────────────────── */}
        <div className="relative px-4 pb-5 flex-shrink-0 flex flex-col items-center">
          <div aria-hidden className="composer-underglow" />
          {/* Mode tabs */}
          <div className="relative mb-3 inline-flex items-center gap-1 p-1 rounded-full glass-panel border border-glass-border">
            {MODES.map((m) => {
              const isActive = selectedModel.category === m.id;
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => switchMode(m.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive ? "bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page glow-primary" : "text-muted hover:text-foreground"
                  }`}>
                  <Icon className="text-sm" /> {m.label}
                </button>
              );
            })}
            <button onClick={() => setIsModelsModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-muted hover:text-foreground transition-all">
              <FiMoreHorizontal className="text-sm" /> See more
            </button>
          </div>

          {/* Composer box */}
          <div className="group w-full max-w-3xl glass-panel rounded-2xl shadow-2xl relative transition-all duration-300
                          focus-within:border-primary-500/50 focus-within:shadow-[0_0_50px_-12px_var(--color-primary)]
                          hover:border-primary-500/30">

            {/* Selected actors / image previews */}
            <AnimatePresence>
              {(uploadedImages.length > 0 || (isAvatar && selectedActorIds.length > 0)) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="flex items-center gap-3 p-4 border-b border-glass-border overflow-x-auto no-scrollbar">
                  {isAvatar && selectedActorIds.map((id) => {
                    const a = actors.find((x) => x.id === id);
                    if (!a) return null;
                    return (
                      <div key={id} className="relative group flex-shrink-0">
                        <img src={a.imageUrl} className="w-8 h-8 rounded object-cover border border-glass-border" alt={a.name} />
                        <button onClick={() => toggleActor(id)} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded">
                          <FiTrash2 className="text-white text-xs" />
                        </button>
                      </div>
                    );
                  })}
                  {uploadedImages.map((img, index) => (
                    <div key={img.id} className="relative group flex-shrink-0">
                      <img src={img.preview} className={`w-8 h-8 rounded object-cover border border-glass-border ${img.status === "uploading" ? "opacity-40" : ""}`} alt={`Upload ${index + 1}`} />
                      {img.status === "uploading" && <div className="absolute inset-0 flex items-center justify-center"><FiLoader className="text-primary-500 animate-spin text-sm" /></div>}
                      <button onClick={() => removeImage(img.id)} className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded"><FiTrash2 className="text-white text-xs" /></button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Script / prompt */}
            <div className="px-4 pt-4">
              <textarea value={prompt} maxLength={MAX_SCRIPT}
                onChange={(e) => { setPrompt(e.target.value); e.target.style.height = "auto"; e.target.style.height = e.target.scrollHeight + "px"; }}
                placeholder={isAvatar ? "Add script..." : `Using ${selectedModel.name}... add a prompt...`}
                className="w-full bg-transparent border-none outline-none text-sm font-medium text-foreground placeholder-muted resize-none max-h-[200px] overflow-y-auto no-scrollbar"
                rows={1} />
            </div>

            <input type="file" ref={fileInputRef} onChange={handleImageUpload} multiple accept="image/*" className="hidden" />

            {/* Action row */}
            <div className="flex items-center justify-between px-3 py-3 gap-2">
              {/* Left: contextual actions */}
              <div className="flex items-center gap-2">
                {isAvatar ? (
                  <>
                    <button onClick={() => setIsActorPickerOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-bg border border-glass-border hover:bg-glass-hover hover:border-primary-500/40 text-xs font-medium text-foreground transition-all">
                      <FiUsers className="text-sm text-muted" />
                      {selectedActorIds.length ? `${selectedActorIds.length} actor${selectedActorIds.length > 1 ? "s" : ""}` : "Add actors"}
                    </button>
                    <div className="flex items-center px-1 rounded-lg bg-glass-bg border border-glass-border hover:border-primary-500/40 transition-all">
                      <FiSmile className="text-sm text-muted ml-2" />
                      <CustomDropdown label="" value={emotion} options={EMOTIONS} onChange={setEmotion} />
                    </div>
                  </>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-glass-bg border border-glass-border hover:bg-glass-hover hover:border-primary-500/40 text-xs font-medium text-foreground transition-all">
                    <FiImage className="text-sm text-muted" /> Add image
                  </button>
                )}
              </div>

              {/* Right: counter, settings, send */}
              <div className="flex items-center gap-3">
                <span className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-muted">
                  <FaCoins className="text-primary-500/80 text-[10px]" /> {getCost()}
                </span>
                <span className="text-[11px] font-medium text-muted tabular-nums">{prompt.length} / {MAX_SCRIPT.toLocaleString()}</span>

                {/* Settings popover */}
                <div className="relative">
                  <button onClick={() => setShowSettings((s) => !s)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all ${showSettings ? "bg-glass-hover border-primary-500/40 text-foreground" : "bg-glass-bg border-glass-border text-muted hover:text-foreground hover:border-primary-500/40"}`}
                    title="Generation settings">
                    <FiSliders className="text-sm" />
                  </button>

                  {showSettings && (
                    <>
                      <div className="fixed inset-0 z-[90]" onClick={() => setShowSettings(false)} />
                      <div className="absolute bottom-full right-0 mb-3 w-72 glass-dropdown rounded-xl shadow-[0_24px_60px_rgba(0,0,0,0.6)] p-4 space-y-3 z-[100]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted">Settings</span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                            <FaCoins className="text-primary-500 text-[10px]" /> {getCost()} credits
                          </span>
                        </div>

                        {/* Model */}
                        <button onClick={() => { setIsModelsModalOpen(true); setShowSettings(false); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-glass-bg border border-glass-border hover:border-primary-500/40 transition-all">
                          <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                            {(() => { const Icon = iconFor(selectedModel.icon); return <Icon className="text-sm text-muted" />; })()}
                            {selectedModel.name}
                          </span>
                          <FiChevronDown className="text-xs text-muted" />
                        </button>

                        {/* Setting rows */}
                        <div className="space-y-1">
                          <Row label="Template">
                            <CustomDropdown icon={FiGrid} label="" value={templateName || "None"}
                              options={TEMPLATES.map((t) => t.name)} onChange={applyTemplatePreset} />
                          </Row>

                          {isAvatar && (
                            <>
                              <Row label="Voice">
                                <CustomDropdown label="" value={VOICES.find((v) => v.id === voiceId)?.name || "Voice"}
                                  options={VOICES.map((v) => v.name)}
                                  onChange={(name) => setVoiceId(VOICES.find((v) => v.name === name)?.id || VOICES[0].id)} />
                              </Row>
                              <Row label="Language">
                                <CustomDropdown icon={FiGlobe} label="" value={language} options={["English", ...LANGUAGES]} onChange={handleTranslate} />
                              </Row>
                            </>
                          )}

                          {/* Dynamic model params */}
                          {selectedModel.params && Object.keys(selectedModel.params).map((key) => {
                            const param = selectedModel.params[key];
                            if (key === "duration" && param.min) {
                              return <Row key={key} label="Length"><RangeParameter label="" value={modelSettings[key]} min={param.min} max={param.max} unit="s" onChange={(val) => updateSetting(key, val)} /></Row>;
                            }
                            if (param.options && param.options.length > 1) {
                              return <Row key={key} label={key.replace("_", " ")}><CustomDropdown label="" value={modelSettings[key]} options={param.options} onChange={(val) => updateSetting(key, val)} /></Row>;
                            }
                            if (param.options && param.options.length === 1) {
                              return (
                                <Row key={key} label={key.replace("_", " ")}>
                                  <span className="text-xs font-medium text-foreground px-3">{param.options[0]}</span>
                                </Row>
                              );
                            }
                            return null;
                          })}
                        </div>

                        {/* AI tools */}
                        <div className="flex items-center gap-2 pt-1 border-t border-glass-border">
                          <button onClick={() => { setAiPanel(aiPanel === "write" ? null : "write"); setShowSettings(false); }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-glass-bg border border-glass-border hover:border-primary-500/40 text-xs font-medium text-foreground transition-all">
                            <FiEdit3 className="text-xs text-muted" /> Write
                          </button>
                          {isAvatar && (
                            <button onClick={() => { setAiPanel(aiPanel === "hooks" ? null : "hooks"); setShowSettings(false); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-glass-bg border border-glass-border hover:border-primary-500/40 text-xs font-medium text-foreground transition-all">
                              <FiZap className="text-xs text-muted" /> Hooks
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Send */}
                {(() => {
                  const ready = !isGenerating && (prompt.trim() || selectedHooks.length > 0);
                  return (
                    <button onClick={handleGenerate} disabled={isGenerating || (!prompt.trim() && selectedHooks.length === 0)}
                      className={`w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page flex items-center justify-center reactive hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:hover:translate-y-0 group ${ready ? "animate-aura" : "glow-primary"}`}>
                      {isGenerating ? <FiLoader className="text-lg animate-spin" /> : <FiArrowUp className="text-lg group-hover:-translate-y-1 transition-all" />}
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* Models Modal */}
        <AnimatePresence>
          {isModelsModalOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsModelsModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-5xl h-[80vh] bg-bg-card border border-glass-border rounded-2xl shadow-2xl flex flex-col overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-glass-border flex items-center gap-6">
                  <div className="relative flex-1">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                    <input type="text" placeholder="Search models..." className="w-full pl-12 pr-4 py-2.5 bg-glass-bg border border-glass-border rounded-lg text-xs font-bold text-foreground placeholder-muted outline-none focus:border-primary-500/50 transition-colors" />
                  </div>
                  <button onClick={() => setIsModelsModalOpen(false)} className="p-2 hover:bg-glass-hover rounded-full"><FiX className="text-xl text-muted" /></button>
                </div>
                <div className="flex-1 p-6 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {MODELS.map((model) => {
                      const Icon = iconFor(model.icon);
                      return (
                        <div key={model.id} onClick={() => { setSelectedModel(model); setIsModelsModalOpen(false); }}
                          className={`spotlight-card reactive p-5 rounded-xl border cursor-pointer space-y-4 group ${selectedModel.id === model.id ? "border-primary-500 ring-1 ring-primary-500/40 bg-primary-500/10 glow-primary" : "border-glass-border bg-glass-bg hover:border-primary-500/40 hover:bg-glass-hover"}`}
                          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`); e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`); }}>
                          <div className="flex items-center justify-between">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-glass-border transition-all ${selectedModel.id === model.id ? "bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page" : "bg-glass-bg text-muted group-hover:bg-primary-500/20 group-hover:text-foreground"}`}>
                              <Icon className="text-lg" />
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${model.type === "AVATAR" ? "bg-primary-500/15 text-primary-300" : "bg-amber-500/15 text-amber-400"}`}>{model.type}</span>
                          </div>
                          <div className="space-y-2">
                            <h4 className="text-xs font-medium text-foreground">{model.name}</h4>
                            <p className="text-xs text-muted font-bold leading-relaxed">{model.description}</p>
                          </div>
                          <span className="text-xs font-medium text-muted/60">{model.params ? Object.keys(model.params).join(" • ") : ""}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Actor Picker Modal */}
        <AnimatePresence>
          {isActorPickerOpen && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setIsActorPickerOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-3xl h-[75vh] bg-bg-card border border-glass-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                <div className="p-5 border-b border-glass-border flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Choose Actor(s)</h3>
                    <p className="text-[11px] text-muted font-bold mt-0.5">Select multiple to batch-test the same script across actors.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => router.push("/actors")} className="text-[11px] font-bold text-primary-500 hover:underline">Manage →</button>
                    <button onClick={() => setIsActorPickerOpen(false)} className="p-2 hover:bg-glass-hover rounded-full"><FiX className="text-muted" /></button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  {actors.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                      <FiUser className="text-3xl text-muted/60" />
                      <p className="text-xs text-muted font-bold">No actors yet.</p>
                      <button onClick={() => router.push("/actors")} className="px-4 py-2 rounded-full bg-primary-500 text-bg-page text-xs font-bold">Create an actor</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {actors.map((a) => {
                        const on = selectedActorIds.includes(a.id);
                        return (
                          <button key={a.id} onClick={() => toggleActor(a.id)}
                            className={`relative rounded-lg overflow-hidden aspect-[3/4] border-2 transition-all ${on ? "border-primary-500 ring-2 ring-primary-500/30" : "border-transparent hover:border-primary-500/40"}`}>
                            <img src={a.imageUrl} className="w-full h-full object-cover" alt={a.name} />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                              <p className="text-white text-[10px] font-bold truncate">{a.name}</p>
                            </div>
                            {on && <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary-500 text-bg-page flex items-center justify-center text-[10px] font-black">✓</div>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="p-4 border-t border-glass-border flex justify-end">
                  <button onClick={() => setIsActorPickerOpen(false)} className="px-6 py-2.5 rounded-full bg-primary-500 text-bg-page text-xs font-bold">
                    Done ({selectedActorIds.length})
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// A labeled row inside the settings popover.
function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs font-medium text-muted capitalize">{label}</span>
      {children}
    </div>
  );
}
