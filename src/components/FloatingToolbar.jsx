"use client";

import { FiVideo, FiImage, FiSearch, FiUser } from "react-icons/fi";

export function FloatingToolbar({ onSeeMore }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full glass-panel shadow-lg">
      <button className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page text-[11px] font-bold glow-primary">
        <FiUser className="text-xs" />
        <span>Talking Actors</span>
      </button>
      <button className="flex items-center gap-2 px-4 py-1.5 rounded-full hover:bg-glass-hover text-[11px] font-bold text-muted hover:text-foreground transition-colors">
        <FiVideo className="text-xs" />
        <span>Video</span>
      </button>
      <button className="flex items-center gap-2 px-4 py-1.5 rounded-full hover:bg-glass-hover text-[11px] font-bold text-muted hover:text-foreground transition-colors">
        <FiImage className="text-xs" />
        <span>Image</span>
      </button>
      <button
        onClick={onSeeMore}
        className="flex items-center gap-2 px-4 py-1.5 rounded-full hover:bg-glass-hover text-[11px] font-bold text-muted hover:text-foreground transition-colors"
      >
        <FiSearch className="text-xs" />
        <span>See more</span>
      </button>
    </div>
  );
}
