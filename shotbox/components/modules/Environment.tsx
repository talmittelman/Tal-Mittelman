"use client";

import { useState } from "react";
import { IMAGE_ASPECTS, imageInput } from "@/lib/models";
import { ENV_ANGLES, envPrompts } from "@/lib/prompts";
import { useJobs, useStudio } from "@/lib/store";
import { Chips, Field, ModuleHeader, PromptPreview, RefPicker, ResultGrid, Select } from "../ui";

const TIMES = ["Golden hour", "Midday", "Overcast afternoon", "Blue hour", "Night", "Pre-dawn"];

export default function Environment() {
  const { settings } = useStudio();
  const { jobs, run, clear, busy } = useJobs();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [time, setTime] = useState(TIMES[0]);
  const [mood, setMood] = useState("");
  const [aspect, setAspect] = useState(settings.aspect);
  const [variations, setVariations] = useState(2);
  const [base, setBase] = useState<string[]>([]);
  const [angles, setAngles] = useState<string[]>(["reverse", "aerial", "ground"]);

  const label = name.trim() || "Location";
  const estPrompt = envPrompts.establishing(desc || "[describe the location]", time, mood || "calm", settings.style);

  const generateEstablishing = () => {
    const { endpoint, input } = imageInput({ prompt: estPrompt, aspect, resolution: settings.resolution, count: variations });
    run([{ label: `${label} establishing`, kind: "image", tag: "environment", endpoint, input, prompt: estPrompt }]);
  };

  const generateAngles = () => {
    run(
      angles.map((key) => {
        const a = ENV_ANGLES.find((x) => x.key === key)!;
        const prompt = envPrompts.angle(a.text, settings.style);
        const { endpoint, input } = imageInput({ prompt, refImages: base, aspect, resolution: settings.resolution });
        return { label: `${label}, ${a.label.toLowerCase()}`, kind: "image" as const, tag: "environment" as const, endpoint, input, prompt };
      }),
    );
  };

  return (
    <div className="module">
      <ModuleHeader
        title="Environment"
        intro="Build the set once, then shoot it from several sides. Empty plates keep the location consistent when characters are placed in it later."
      />
      <div className="module-body">
        <form className="controls" onSubmit={(e) => e.preventDefault()}>
          <h2 className="step-title">Establishing shot</h2>
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rooftop skatepark" />
          </Field>
          <Field label="Location" hint="Place, architecture, materials, weather, what's in the foreground.">
            <textarea
              rows={4}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="a concrete skatepark on a Tel Aviv rooftop, chipped turquoise paint on the ramps, water tanks and satellite dishes, the sea visible between buildings"
            />
          </Field>
          <div className="field-pair">
            <Field label="Time of day">
              <Select value={time} onChange={setTime} options={TIMES} />
            </Field>
            <Field label="Aspect">
              <Select value={aspect} onChange={setAspect} options={IMAGE_ASPECTS} />
            </Field>
          </div>
          <Field label="Mood">
            <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="sun-bleached, lazy, nostalgic" />
          </Field>
          <Field label="Variations">
            <input type="range" min={1} max={4} value={variations} onChange={(e) => setVariations(+e.target.value)} />
            <span className="range-value">{variations}</span>
          </Field>
          <PromptPreview prompt={estPrompt} />
          <button type="button" className="primary" disabled={!desc.trim()} onClick={generateEstablishing}>
            Generate establishing shot
          </button>

          <hr />

          <h2 className="step-title">Cover the set</h2>
          <RefPicker label="Base location" tags={["environment"]} value={base} onChange={setBase} />
          <Field label="Angles">
            <Chips options={ENV_ANGLES} selected={angles} onToggle={(k) => setAngles((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} />
          </Field>
          <button type="button" className="primary" disabled={!base.length || !angles.length} onClick={generateAngles}>
            Generate {angles.length} angle{angles.length === 1 ? "" : "s"}
          </button>
          {busy && <p className="busy-note">Images take about 20–60 seconds each.</p>}
        </form>
        <ResultGrid jobs={jobs} onClear={clear} wide emptyText="Location plates will appear here. Lock the strongest one to use it as the set in your storyboard." />
      </div>
    </div>
  );
}
