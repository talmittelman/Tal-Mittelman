"use client";

import { useState } from "react";
import Library from "@/components/Library";
import Camera from "@/components/modules/Camera";
import Character from "@/components/modules/Character";
import Environment from "@/components/modules/Environment";
import Storyboard from "@/components/modules/Storyboard";
import { ImageToVideo, TextToVideo, VideoToVideo } from "@/components/modules/VideoModules";
import { IMAGE_RESOLUTIONS } from "@/lib/models";
import { ModuleKey, StudioProvider, useStudio } from "@/lib/store";

const PIPELINE: { key: ModuleKey; label: string }[] = [
  { key: "character", label: "Character" },
  { key: "environment", label: "Environment" },
  { key: "storyboard", label: "Storyboard" },
  { key: "camera", label: "Camera angles" },
  { key: "i2v", label: "Image to video" },
];

const DIRECT: { key: ModuleKey; label: string }[] = [
  { key: "t2v", label: "Text to video" },
  { key: "v2v", label: "Video to video" },
];

const MODULES: Record<ModuleKey, React.ComponentType> = {
  character: Character,
  environment: Environment,
  storyboard: Storyboard,
  camera: Camera,
  i2v: ImageToVideo,
  t2v: TextToVideo,
  v2v: VideoToVideo,
};

function Studio() {
  const { active, setActive, settings, setSettings, assets } = useStudio();
  const [libraryOpen, setLibraryOpen] = useState(false);

  return (
    <div className={libraryOpen ? "app with-library" : "app"}>
      <nav className="rail" aria-label="Modules">
        <div className="brand">Shotbox</div>
        <p className="rail-group">Pipeline</p>
        <ol className="rail-list">
          {PIPELINE.map((m, i) => (
            <li key={m.key}>
              <button type="button" className={active === m.key ? "rail-item on" : "rail-item"} aria-current={active === m.key ? "page" : undefined} onClick={() => setActive(m.key)}>
                <span className="rail-no">{i + 1}</span>
                {m.label}
              </button>
            </li>
          ))}
        </ol>
        <p className="rail-group">Direct</p>
        <ul className="rail-list">
          {DIRECT.map((m) => (
            <li key={m.key}>
              <button type="button" className={active === m.key ? "rail-item on" : "rail-item"} aria-current={active === m.key ? "page" : undefined} onClick={() => setActive(m.key)}>
                {m.label}
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className="rail-library" onClick={() => setLibraryOpen((o) => !o)} aria-expanded={libraryOpen}>
          Library <span className="count">{assets.length}</span>
        </button>
      </nav>

      <main className="stage">
        <div className="style-lock">
          <label htmlFor="style-lock">Project look</label>
          <input
            id="style-lock"
            value={settings.style}
            onChange={(e) => setSettings({ style: e.target.value })}
            placeholder="Added to every image and video prompt, e.g. shot on 35mm Kodak Portra, soft halation, muted teal and amber grade"
          />
          <label htmlFor="img-res" className="style-lock-res">
            Image size
          </label>
          <select id="img-res" value={settings.resolution} onChange={(e) => setSettings({ resolution: e.target.value })}>
            {IMAGE_RESOLUTIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
        {(Object.keys(MODULES) as ModuleKey[]).map((key) => {
          const Mod = MODULES[key];
          // All modules stay mounted so running jobs survive switching tabs.
          return (
            <div key={key} hidden={active !== key}>
              <Mod />
            </div>
          );
        })}
      </main>

      {libraryOpen && <Library onClose={() => setLibraryOpen(false)} />}
    </div>
  );
}

export default function Page() {
  return (
    <StudioProvider>
      <Studio />
    </StudioProvider>
  );
}
