"use client";

import { useState } from "react";
import { AssetTag, useStudio } from "@/lib/store";

const FILTERS: { key: AssetTag | "all" | "pinned"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pinned", label: "Locked" },
  { key: "character", label: "Characters" },
  { key: "environment", label: "Sets" },
  { key: "frame", label: "Frames" },
  { key: "angle", label: "Angles" },
  { key: "video", label: "Clips" },
  { key: "upload", label: "Uploads" },
];

export default function Library({ onClose }: { onClose: () => void }) {
  const { assets, removeAsset, togglePin, renameAsset, sendTo } = useStudio();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const shown = assets.filter((a) => (filter === "all" ? true : filter === "pinned" ? a.pinned : a.tag === filter));
  const sel = assets.find((a) => a.id === selected);

  return (
    <aside className="library" aria-label="Library">
      <div className="library-head">
        <h2>Library</h2>
        <button type="button" className="link-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="library-filters">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className={filter === f.key ? "chip on" : "chip"} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="empty-note">
          {assets.length === 0 ? "Everything you generate or upload is kept here, in this browser." : "Nothing in this group yet."}
        </p>
      ) : (
        <div className="library-grid">
          {shown.map((a) => (
            <button
              key={a.id}
              type="button"
              className={selected === a.id ? "lib-item on" : "lib-item"}
              onClick={() => setSelected(selected === a.id ? null : a.id)}
              title={a.label}
            >
              {a.kind === "video" ? <video src={a.url} muted /> : <img src={a.url} alt={a.label} loading="lazy" />}
              {a.pinned && <span className="pin-dot" aria-label="Locked reference" />}
            </button>
          ))}
        </div>
      )}
      {sel && (
        <div className="lib-detail">
          <input aria-label="Name" value={sel.label} onChange={(e) => renameAsset(sel.id, e.target.value)} />
          {sel.prompt && (
            <details>
              <summary>Prompt</summary>
              <pre>{sel.prompt}</pre>
            </details>
          )}
          <div className="lib-actions">
            {sel.kind === "image" && (
              <>
                <button type="button" onClick={() => togglePin(sel.id)}>
                  {sel.pinned ? "Unlock" : "Lock as ref"}
                </button>
                <button type="button" onClick={() => sendTo("camera", sel.url)}>
                  Re-angle
                </button>
                <button type="button" onClick={() => sendTo("i2v", sel.url)}>
                  Animate
                </button>
              </>
            )}
            {sel.kind === "video" && (
              <button type="button" onClick={() => sendTo("v2v", sel.url)}>
                Edit video
              </button>
            )}
            <a href={sel.url} target="_blank" rel="noreferrer">
              Open
            </a>
            <button
              type="button"
              className="danger"
              onClick={() => {
                removeAsset(sel.id);
                setSelected(null);
              }}
            >
              Remove
            </button>
          </div>
        </div>
      )}
      <p className="library-foot">fal deletes hosted files after a while. Download anything you want to keep.</p>
    </aside>
  );
}
