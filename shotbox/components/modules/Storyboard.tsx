"use client";

import { useState } from "react";
import { IMAGE_ASPECTS, imageInput } from "@/lib/models";
import { FRAME_LOOKS, SHOT_TYPES, storyboardFramePrompt } from "@/lib/prompts";
import { useJobs, useStudio } from "@/lib/store";
import { Field, ModuleHeader, PromptPreview, RefPicker, ResultGrid, Select } from "../ui";

type Shot = { id: number; type: string; action: string };

const LOOK_OPTIONS = [
  { value: "film", label: "Final frame" },
  { value: "sketch", label: "Pencil sketch" },
  { value: "animatic", label: "Greyscale animatic" },
];

let nextId = 4;

export default function Storyboard() {
  const { settings } = useStudio();
  const { jobs, run, clear, busy } = useJobs();
  const [characters, setCharacters] = useState<string[]>([]);
  const [environment, setEnvironment] = useState<string[]>([]);
  const [scene, setScene] = useState("");
  const [look, setLook] = useState<keyof typeof FRAME_LOOKS>("film");
  const [aspect, setAspect] = useState(settings.aspect);
  const [shots, setShots] = useState<Shot[]>([
    { id: 1, type: "Wide shot", action: "" },
    { id: 2, type: "Medium shot", action: "" },
    { id: 3, type: "Close-up", action: "" },
  ]);

  const filled = shots.filter((s) => s.action.trim());

  const promptFor = (s: Shot, i: number, total: number) =>
    storyboardFramePrompt({
      shotType: s.type,
      action: s.action || "[what happens in this shot]",
      sceneContext: scene,
      characterCount: characters.length,
      hasEnvironment: environment.length > 0,
      look,
      style: settings.style,
      shotNumber: i + 1,
      total,
    });

  const update = (id: number, patch: Partial<Shot>) => setShots((p) => p.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i: number, dir: -1 | 1) =>
    setShots((p) => {
      const n = [...p];
      const j = i + dir;
      if (j < 0 || j >= n.length) return p;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  const generate = () => {
    clear();
    const refs = [...characters, ...environment];
    run(
      filled.map((s, i) => {
        const prompt = promptFor(s, i, filled.length);
        const { endpoint, input } = imageInput({ prompt, refImages: refs, aspect, resolution: settings.resolution });
        return { label: `Shot ${i + 1}, ${s.type.toLowerCase()}`, kind: "image" as const, tag: "frame" as const, endpoint, input, prompt };
      }),
      4,
    );
  };

  return (
    <div className="module">
      <ModuleHeader
        title="Storyboard"
        intro="Write the shot list, attach your locked character and set, and get every frame back in order. Re-angle any frame you don't like instead of re-rolling it."
      />
      <div className="module-body">
        <form className="controls" onSubmit={(e) => e.preventDefault()}>
          <RefPicker
            label="Characters"
            hint="Up to 5. Order matters: the first is 'image 1' in the prompt."
            multiple
            max={5}
            tags={["character"]}
            value={characters}
            onChange={setCharacters}
          />
          <RefPicker label="Set" tags={["environment"]} value={environment} onChange={setEnvironment} />
          <Field label="Scene" hint="What the whole sequence is about. Shared by every shot.">
            <textarea rows={3} value={scene} onChange={(e) => setScene(e.target.value)} placeholder="Noa lands her first kickflip at sunset while her friends film on their phones." />
          </Field>
          <div className="field-pair">
            <Field label="Look">
              <Select value={look} onChange={(v) => setLook(v as keyof typeof FRAME_LOOKS)} options={LOOK_OPTIONS} />
            </Field>
            <Field label="Aspect">
              <Select value={aspect} onChange={setAspect} options={IMAGE_ASPECTS} />
            </Field>
          </div>

          <div className="shot-list">
            <span className="field-label">Shot list</span>
            <ol>
              {shots.map((s, i) => (
                <li key={s.id} className="shot-row">
                  <div className="shot-row-head">
                    <span className="shot-row-no">{i + 1}</span>
                    <Select value={s.type} onChange={(v) => update(s.id, { type: v })} options={SHOT_TYPES} />
                    <span className="shot-row-tools">
                      <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0}>
                        ↑
                      </button>
                      <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === shots.length - 1}>
                        ↓
                      </button>
                      <button type="button" aria-label="Remove shot" onClick={() => setShots((p) => p.filter((x) => x.id !== s.id))} disabled={shots.length === 1}>
                        ×
                      </button>
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={s.action}
                    onChange={(e) => update(s.id, { action: e.target.value })}
                    placeholder="Who does what, where the camera is, what we feel."
                  />
                </li>
              ))}
            </ol>
            <button type="button" className="ghost" onClick={() => setShots((p) => [...p, { id: nextId++, type: "Medium shot", action: "" }])} disabled={shots.length >= 16}>
              Add shot
            </button>
          </div>

          {filled[0] && <PromptPreview prompt={promptFor(filled[0], 0, filled.length)} />}
          <button type="button" className="primary" disabled={!filled.length || busy} onClick={generate}>
            Generate {filled.length} frame{filled.length === 1 ? "" : "s"}
          </button>
          {!characters.length && !environment.length && filled.length > 0 && (
            <p className="busy-note">No references attached, so characters and set may change between frames.</p>
          )}
        </form>
        <ResultGrid jobs={jobs} onClear={clear} wide numbered emptyText="Frames come back here in shot order. Generating again replaces this board." />
      </div>
    </div>
  );
}
