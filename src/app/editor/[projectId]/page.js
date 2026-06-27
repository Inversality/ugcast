"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Player } from "@remotion/player";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus, FiLoader, FiX, FiTrash2, FiArrowUp, FiArrowDown, FiMusic, FiType,
  FiFilm, FiSave, FiPlay, FiDownload, FiCheckCircle, FiAlertCircle,
} from "react-icons/fi";
import AdComposition, { totalDurationInFrames } from "../../../../remotion/AdComposition.jsx";

const FPS = 30;

// Probe a video URL for its duration (seconds) without playing it.
function probeDuration(url) {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => resolve(v.duration || 5);
    v.onerror = () => resolve(5);
    v.src = url;
  });
}

export default function ProjectEditor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { projectId } = useParams();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Untitled ad");
  const [scenes, setScenes] = useState([]);
  const [music, setMusic] = useState(null);
  const [captionStyle, setCaptionStyle] = useState({ uppercase: false });
  const [projectStatus, setProjectStatus] = useState("draft");
  const [outputUrl, setOutputUrl] = useState(null);

  const [creations, setCreations] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [musicBusy, setMusicBusy] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => { if (status === "unauthenticated") signIn(); }, [status]);

  // Load project + the user's completed clips
  useEffect(() => {
    if (!session) return;
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`),
          fetch("/api/creations"),
        ]);
        if (pRes.ok) {
          const p = await pRes.json();
          setTitle(p.title || "Untitled ad");
          const t = p.timeline || {};
          setScenes(t.scenes || []);
          setMusic(t.music || null);
          setCaptionStyle(t.captionStyle || { uppercase: false });
          setProjectStatus(p.status);
          setOutputUrl(p.outputUrl);
        }
        if (cRes.ok) {
          const all = await cRes.json();
          setCreations((Array.isArray(all) ? all : []).filter((c) => c.status === "completed" && c.url));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [session, projectId]);

  useEffect(() => () => clearInterval(pollRef.current), []);

  const timeline = { scenes, music, captionStyle, width: 1080, height: 1920 };
  const totalFrames = totalDurationInFrames(scenes);

  const addScene = async (creation) => {
    const seconds = await probeDuration(creation.url);
    const durationInFrames = Math.max(FPS, Math.round(seconds * FPS));
    setScenes((prev) => [
      ...prev,
      {
        id: `scene_${Math.random().toString(36).slice(2, 9)}`,
        creationId: creation.id,
        videoUrl: creation.url,
        script: creation.script || creation.prompt || "",
        durationInFrames,
        captionsEnabled: false,
        captions: [],
        transition: prev.length ? "fade" : "none",
        muted: false,
      },
    ]);
    setPickerOpen(false);
  };

  const updateScene = (id, patch) => setScenes((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const removeScene = (id) => setScenes((prev) => prev.filter((s) => s.id !== id));
  const moveScene = (i, dir) => {
    setScenes((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const toggleCaptions = async (scene) => {
    if (scene.captionsEnabled) {
      updateScene(scene.id, { captionsEnabled: false });
      return;
    }
    if (!scene.script) {
      alert("This clip has no script to caption.");
      return;
    }
    try {
      const res = await fetch("/api/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: scene.script, durationInFrames: scene.durationInFrames }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      updateScene(scene.id, { captionsEnabled: true, captions: data.captions });
    } catch (e) {
      alert(e.message);
    }
  };

  const generateMusic = async () => {
    setMusicBusy(true);
    try {
      const res = await fetch("/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: Math.round(totalFrames / FPS) || 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMusic({ url: data.url, volume: 0.25 });
    } catch (e) {
      alert(e.message);
    } finally {
      setMusicBusy(false);
    }
  };

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, timeline }),
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, title, scenes, music, captionStyle]);

  const render = async () => {
    if (!scenes.length) { alert("Add at least one scene first."); return; }
    await save();
    setRendering(true);
    setProjectStatus("rendering");
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setOutputUrl(data.outputUrl);
      setProjectStatus("completed");
    } catch (e) {
      // The render may still be running on a worker — fall back to polling.
      pollRef.current = setInterval(async () => {
        const r = await fetch(`/api/projects/${projectId}`);
        if (r.ok) {
          const p = await r.json();
          setProjectStatus(p.status);
          if (p.status === "completed" || p.status === "failed") {
            setOutputUrl(p.outputUrl);
            clearInterval(pollRef.current);
            setRendering(false);
          }
        }
      }, 4000);
      if (e.message) console.error(e.message);
    } finally {
      setRendering(false);
    }
  };

  if (status === "loading" || !session) return null;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 px-6 py-3 border-b border-glass-border bg-glass-bg/50">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push("/editor")} className="text-xs font-bold text-muted hover:text-foreground">← Ads</button>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            className="bg-transparent text-sm font-black text-foreground outline-none border-b border-transparent focus:border-glass-border px-1 min-w-0" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-glass-border bg-glass-bg hover:bg-glass-hover text-foreground font-bold text-xs disabled:opacity-50">
            {saving ? <FiLoader className="animate-spin" /> : <FiSave />} Save
          </button>
          <button onClick={render} disabled={rendering || !scenes.length}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 hover:brightness-110 text-bg-page font-bold text-xs glow-primary disabled:opacity-50 transition-all">
            {rendering ? <FiLoader className="animate-spin" /> : <FiPlay />} Render
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Preview */}
        <div className="lg:w-[42%] p-6 flex flex-col items-center justify-center bg-black/[0.02] border-b lg:border-b-0 lg:border-r border-glass-border">
          <div className="relative w-full max-w-[300px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl bg-black">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center"><FiLoader className="text-2xl text-white/50 animate-spin" /></div>
            ) : !scenes.length ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/40">
                <FiFilm className="text-3xl" /><span className="text-xs font-bold">Add a scene</span>
              </div>
            ) : mounted ? (
              <Player
                component={AdComposition}
                inputProps={timeline}
                durationInFrames={totalFrames}
                fps={FPS}
                compositionWidth={1080}
                compositionHeight={1920}
                style={{ width: "100%", height: "100%" }}
                controls
                loop
              />
            ) : null}
          </div>
          {projectStatus === "completed" && outputUrl && (
            <a href={outputUrl} download target="_blank" rel="noopener noreferrer"
              className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500 text-white font-bold text-xs">
              <FiDownload /> Download final MP4
            </a>
          )}
          {projectStatus === "rendering" && (
            <p className="mt-4 text-xs font-bold text-primary-500 flex items-center gap-2"><FiLoader className="animate-spin" /> Rendering…</p>
          )}
          {projectStatus === "failed" && (
            <p className="mt-4 text-xs font-bold text-rose-500 flex items-center gap-2"><FiAlertCircle /> Render failed</p>
          )}
        </div>

        {/* Timeline / controls */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Music + caption style */}
          <div className="flex flex-wrap items-center gap-3">
            {music ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-glass-bg border border-glass-border">
                <FiMusic className="text-xs text-primary-500" />
                <span className="text-xs font-bold text-foreground">Music added</span>
                <input type="range" min={0} max={100} value={(music.volume ?? 0.25) * 100}
                  onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) / 100 })}
                  className="w-20 accent-primary-500" />
                <button onClick={() => setMusic(null)} className="text-rose-500"><FiX className="text-xs" /></button>
              </div>
            ) : (
              <button onClick={generateMusic} disabled={musicBusy}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-glass-border bg-glass-bg hover:bg-glass-hover text-foreground font-bold text-xs disabled:opacity-50">
                {musicBusy ? <FiLoader className="animate-spin" /> : <FiMusic />} Add music
              </button>
            )}
            <button onClick={() => setCaptionStyle((s) => ({ ...s, uppercase: !s.uppercase }))}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border font-bold text-xs transition-colors ${captionStyle.uppercase ? "bg-primary-500 text-bg-page border-primary-500" : "border-glass-border bg-glass-bg text-foreground hover:bg-glass-hover"}`}>
              <FiType /> UPPERCASE captions
            </button>
          </div>

          {/* Scenes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-muted">Scenes ({scenes.length})</span>
              <button onClick={() => setPickerOpen(true)} className="flex items-center gap-1.5 text-xs font-bold text-primary-500 hover:underline"><FiPlus /> Add scene</button>
            </div>

            {scenes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-glass-border p-8 text-center">
                <p className="text-xs font-medium text-muted">No scenes yet. Add your generated clips to build the ad.</p>
              </div>
            ) : (
              scenes.map((scene, i) => (
                <div key={scene.id} className="flex items-center gap-3 rounded-lg border border-glass-border bg-solid-bg p-3">
                  <div className="w-12 h-16 rounded overflow-hidden bg-black flex-shrink-0">
                    <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{scene.script || "B-roll clip"}</p>
                    <p className="text-[10px] text-muted font-bold mt-0.5">{(scene.durationInFrames / FPS).toFixed(1)}s</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => toggleCaptions(scene)}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${scene.captionsEnabled ? "bg-primary-500 text-bg-page" : "bg-glass-hover text-muted"}`}>
                        Captions
                      </button>
                      <button onClick={() => updateScene(scene.id, { transition: scene.transition === "fade" ? "none" : "fade" })}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${scene.transition === "fade" ? "bg-primary-500 text-bg-page" : "bg-glass-hover text-muted"}`}>
                        Fade
                      </button>
                      <button onClick={() => updateScene(scene.id, { muted: !scene.muted })}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${scene.muted ? "bg-primary-500/30 text-foreground" : "bg-glass-hover text-muted"}`}>
                        {scene.muted ? "Muted" : "Sound"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => moveScene(i, -1)} disabled={i === 0} className="p-1 rounded hover:bg-glass-hover text-muted disabled:opacity-30"><FiArrowUp className="text-xs" /></button>
                    <button onClick={() => moveScene(i, 1)} disabled={i === scenes.length - 1} className="p-1 rounded hover:bg-glass-hover text-muted disabled:opacity-30"><FiArrowDown className="text-xs" /></button>
                  </div>
                  <button onClick={() => removeScene(scene.id)} className="p-2 rounded-full hover:bg-rose-500/10 text-rose-500"><FiTrash2 className="text-sm" /></button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Clip picker */}
      <AnimatePresence>
        {pickerOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPickerOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl h-[75vh] bg-bg-card border border-glass-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 border-b border-glass-border flex items-center justify-between">
                <h3 className="text-sm font-black text-foreground uppercase tracking-wider">Add a clip</h3>
                <button onClick={() => setPickerOpen(false)} className="p-2 hover:bg-glass-hover rounded-full"><FiX className="text-muted" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                {creations.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                    <FiFilm className="text-3xl text-muted/60" />
                    <p className="text-xs text-muted font-bold">No completed clips yet. Generate some in the studio first.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {creations.map((c) => (
                      <button key={c.id} onClick={() => addScene(c)}
                        className="relative rounded-lg overflow-hidden aspect-[9/16] border-2 border-transparent hover:border-primary-500 transition-all">
                        <video src={c.url} className="w-full h-full object-cover" muted />
                        <div className="absolute inset-0 bg-black/0 hover:bg-black/20 flex items-center justify-center transition-colors">
                          <FiPlus className="text-white opacity-0 hover:opacity-100 text-2xl" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
