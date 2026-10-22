"use client";

import { useEffect, useRef, useState } from "react";
import { uploadFile, errorMessage } from "@/lib/fal";
import { Asset, AssetKind, AssetTag, Job, ModuleKey, useStudio } from "@/lib/store";

export function ModuleHeader({ title, intro }: { title: string; intro: string }) {
  return (
    <header className="module-header">
      <h1>{title}</h1>
      <p>{intro}</p>
    </header>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | { value: string; label: string })[];
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.value;
        const l = typeof o === "string" ? o : o.label;
        return (
          <option key={v} value={v}>
            {l}
          </option>
        );
      })}
    </select>
  );
}

export function Chips({
  options,
  selected,
  onToggle,
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="chips" role="group">
      {options.map((o) => (
        <button
          type="button"
          key={o.key}
          className={selected.includes(o.key) ? "chip on" : "chip"}
          aria-pressed={selected.includes(o.key)}
          onClick={() => onToggle(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PromptPreview({ prompt }: { prompt: string }) {
  if (!prompt.trim()) return null;
  return (
    <details className="prompt-preview">
      <summary>See the prompt that will be sent</summary>
      <pre>{prompt}</pre>
    </details>
  );
}

// ---------- Reference picker ----------
export function RefPicker({
  label,
  hint,
  kind = "image",
  multiple = false,
  max = 6,
  tags,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  kind?: AssetKind;
  multiple?: boolean;
  max?: number;
  tags?: AssetTag[];
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const { assets, addAsset } = useStudio();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const pool = assets
    .filter((a) => a.kind === kind && (!tags || tags.includes(a.tag) || a.tag === "upload"))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));

  const toggle = (url: string) => {
    if (value.includes(url)) onChange(value.filter((u) => u !== url));
    else if (multiple) onChange([...value, url].slice(0, max));
    else {
      onChange([url]);
      setOpen(false);
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    try {
      const urls: string[] = [];
      for (const f of Array.from(files)) {
        const url = await uploadFile(f);
        addAsset({ url, kind, tag: "upload", label: f.name });
        urls.push(url);
      }
      onChange(multiple ? [...value, ...urls].slice(0, max) : [urls[0]]);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="ref-row">
        {value.map((url, i) => (
          <div className="ref-thumb" key={url}>
            {kind === "video" ? <video src={url} muted /> : <img src={url} alt="" />}
            {multiple && <span className="ref-index">{i + 1}</span>}
            <button type="button" className="ref-remove" aria-label="Remove reference" onClick={() => toggle(url)}>
              ×
            </button>
          </div>
        ))}
        {(multiple ? value.length < max : value.length === 0) && (
          <>
            <button type="button" className="ref-add" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? "Close library" : "From library"}
            </button>
            <button type="button" className="ref-add" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          hidden
          multiple={multiple}
          accept={kind === "video" ? "video/mp4,video/quicktime" : "image/*"}
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
      {open && (
        <div className="ref-library">
          {pool.length === 0 && <p className="empty-note">Nothing here yet. Generate something or upload a file.</p>}
          {pool.map((a) => (
            <button
              type="button"
              key={a.id}
              className={value.includes(a.url) ? "ref-option on" : "ref-option"}
              onClick={() => toggle(a.url)}
              title={a.label}
            >
              {a.kind === "video" ? <video src={a.url} muted /> : <img src={a.url} alt={a.label} />}
              {a.pinned && <span className="pin-dot" aria-label="Locked reference" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Results ----------
async function download(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    const ext = blob.type.split("/")[1]?.split(";")[0] || "bin";
    a.download = `${name.replace(/[^a-z0-9-_]+/gi, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

function elapsed(from: number) {
  const s = Math.round((Date.now() - from) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function ResultGrid({
  jobs,
  onClear,
  emptyText,
  wide = false,
  numbered = false,
}: {
  jobs: Job[];
  onClear: () => void;
  emptyText: string;
  wide?: boolean;
  numbered?: boolean;
}) {
  const { sendTo, assets, togglePin } = useStudio();
  const finished = jobs.filter((j) => j.status === "done" || j.status === "error").length;

  if (!jobs.length) return <div className="results-empty">{emptyText}</div>;

  const ordered = numbered ? [...jobs].reverse() : jobs;

  return (
    <section className="results" aria-live="polite">
      <div className="results-bar">
        <span>
          {finished} of {jobs.length} finished
        </span>
        {finished > 0 && (
          <button type="button" className="link-btn" onClick={onClear}>
            Clear finished
          </button>
        )}
      </div>
      <div className={wide ? "result-grid wide" : "result-grid"}>
        {ordered.map((j, idx) => {
          const asset = assets.find((a) => a.url === j.url);
          return (
            <figure key={j.id} className={`result ${j.status}`}>
              <div className="result-media">
                {j.status === "done" && j.url ? (
                  j.kind === "video" ? (
                    <video src={j.url} controls loop playsInline />
                  ) : (
                    <a href={j.url} target="_blank" rel="noreferrer">
                      <img src={j.url} alt={j.label} />
                    </a>
                  )
                ) : j.status === "error" ? (
                  <p className="result-error">{j.error}</p>
                ) : (
                  <div className="result-wait">
                    <span className="spinner" aria-hidden />
                    <span>{j.status === "queued" ? "Waiting in queue" : "Generating"}</span>
                    <Ticker from={j.startedAt} />
                  </div>
                )}
                {numbered && <span className="shot-no">{idx + 1}</span>}
              </div>
              <figcaption>
                <span className="result-label">{j.label}</span>
                {j.status === "done" && j.url && (
                  <span className="result-actions">
                    <button type="button" onClick={() => download(j.url!, j.label)}>
                      Download
                    </button>
                    {j.kind === "image" && (
                      <>
                        {asset && (
                          <button type="button" onClick={() => togglePin(asset.id)}>
                            {asset.pinned ? "Unlock" : "Lock as ref"}
                          </button>
                        )}
                        <ActionMenu url={j.url} sendTo={sendTo} />
                      </>
                    )}
                    {j.kind === "video" && (
                      <button type="button" onClick={() => sendTo("v2v", j.url!)}>
                        Edit video
                      </button>
                    )}
                  </span>
                )}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </section>
  );
}

function ActionMenu({ url, sendTo }: { url: string; sendTo: (t: ModuleKey, u: string) => void }) {
  return (
    <>
      <button type="button" onClick={() => sendTo("camera", url)}>
        Re-angle
      </button>
      <button type="button" onClick={() => sendTo("i2v", url)}>
        Animate
      </button>
    </>
  );
}

function Ticker({ from }: { from: number }) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="ticker">{elapsed(from)}</span>;
}

export type { Asset };
