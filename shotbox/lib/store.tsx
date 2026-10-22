"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { errorMessage, extractUrls, pool, runModel } from "./fal";

export type AssetKind = "image" | "video";
export type AssetTag = "character" | "environment" | "frame" | "angle" | "video" | "upload";

export type Asset = {
  id: string;
  url: string;
  kind: AssetKind;
  tag: AssetTag;
  label: string;
  prompt?: string;
  pinned?: boolean;
  createdAt: number;
};

export type ModuleKey = "character" | "environment" | "storyboard" | "camera" | "i2v" | "t2v" | "v2v";

export type Handoff = { target: ModuleKey; url: string } | null;

type Settings = { style: string; aspect: string; resolution: string };

type Ctx = {
  assets: Asset[];
  addAsset: (a: Omit<Asset, "id" | "createdAt">) => Asset;
  removeAsset: (id: string) => void;
  togglePin: (id: string) => void;
  renameAsset: (id: string, label: string) => void;
  settings: Settings;
  setSettings: (s: Partial<Settings>) => void;
  active: ModuleKey;
  setActive: (m: ModuleKey) => void;
  handoff: Handoff;
  sendTo: (target: ModuleKey, url: string) => void;
  consumeHandoff: (target: ModuleKey) => string | null;
};

const StudioContext = createContext<Ctx | null>(null);

const LS_ASSETS = "shotbox.assets.v1";
const LS_SETTINGS = "shotbox.settings.v1";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: library just won't persist */
  }
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [settings, setSettingsState] = useState<Settings>({ style: "", aspect: "16:9", resolution: "1K" });
  const [active, setActive] = useState<ModuleKey>("character");
  const [handoff, setHandoff] = useState<Handoff>(null);
  const loaded = useRef(false);

  useEffect(() => {
    setAssets(load(LS_ASSETS, []));
    setSettingsState((s) => ({ ...s, ...load(LS_SETTINGS, {}) }));
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current) save(LS_ASSETS, assets);
  }, [assets]);
  useEffect(() => {
    if (loaded.current) save(LS_SETTINGS, settings);
  }, [settings]);

  const addAsset = useCallback((a: Omit<Asset, "id" | "createdAt">) => {
    const asset = { ...a, id: uid(), createdAt: Date.now() };
    setAssets((prev) => [asset, ...prev]);
    return asset;
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      assets,
      addAsset,
      removeAsset: (id) => setAssets((p) => p.filter((a) => a.id !== id)),
      togglePin: (id) => setAssets((p) => p.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a))),
      renameAsset: (id, label) => setAssets((p) => p.map((a) => (a.id === id ? { ...a, label } : a))),
      settings,
      setSettings: (s) => setSettingsState((p) => ({ ...p, ...s })),
      active,
      setActive,
      handoff,
      sendTo: (target, url) => {
        setHandoff({ target, url });
        setActive(target);
      },
      consumeHandoff: (target) => {
        if (handoff && handoff.target === target) {
          const url = handoff.url;
          setHandoff(null);
          return url;
        }
        return null;
      },
    }),
    [assets, addAsset, settings, active, handoff],
  );

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>;
}

export function useStudio() {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio must be used inside StudioProvider");
  return ctx;
}

// ---------- Jobs ----------
export type Job = {
  id: string;
  label: string;
  kind: AssetKind;
  status: "queued" | "running" | "done" | "error";
  url?: string;
  extraUrls?: string[];
  error?: string;
  prompt: string;
  startedAt: number;
};

export type JobSpec = {
  label: string;
  kind: AssetKind;
  tag: AssetTag;
  endpoint: string;
  input: Record<string, unknown>;
  prompt: string;
};

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { addAsset } = useStudio();

  const update = (id: string, patch: Partial<Job>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const run = useCallback(
    async (specs: JobSpec[], concurrency = 3) => {
      const created: Job[] = specs.map((s) => ({
        id: uid(),
        label: s.label,
        kind: s.kind,
        status: "queued",
        prompt: s.prompt,
        startedAt: Date.now(),
      }));
      setJobs((prev) => [...created, ...prev]);

      await pool(
        specs.map((spec, i) => async () => {
          const id = created[i].id;
          try {
            const data = await runModel(spec.endpoint, spec.input, (st) => update(id, { status: st }));
            const urls = extractUrls(data);
            if (!urls.length) throw new Error("The model returned no output.");
            update(id, { status: "done", url: urls[0], extraUrls: urls.slice(1) });
            urls.forEach((url, n) =>
              addAsset({
                url,
                kind: spec.kind,
                tag: spec.tag,
                label: urls.length > 1 ? `${spec.label} ${n + 1}` : spec.label,
                prompt: spec.prompt,
              }),
            );
          } catch (e) {
            update(id, { status: "error", error: errorMessage(e) });
          }
        }),
        concurrency,
      );
    },
    [addAsset],
  );

  const clear = () => setJobs((prev) => prev.filter((j) => j.status === "queued" || j.status === "running"));
  const busy = jobs.some((j) => j.status === "queued" || j.status === "running");

  return { jobs, run, clear, busy };
}
