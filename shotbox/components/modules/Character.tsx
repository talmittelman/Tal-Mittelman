"use client";

import { useState } from "react";
import { imageInput } from "@/lib/models";
import { characterPrompts } from "@/lib/prompts";
import { JobSpec, useJobs, useStudio } from "@/lib/store";
import { Chips, Field, ModuleHeader, PromptPreview, RefPicker, ResultGrid } from "../ui";

const SHEETS = [
  { key: "turnaround", label: "Turnaround" },
  { key: "expressions", label: "Expressions" },
  { key: "poses", label: "Action poses" },
];

export default function Character() {
  const { settings } = useStudio();
  const { jobs, run, clear, busy } = useJobs();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [variations, setVariations] = useState(2);
  const [master, setMaster] = useState<string[]>([]);
  const [sheets, setSheets] = useState<string[]>(["turnaround", "expressions"]);

  const masterPrompt = characterPrompts.master(desc || "[describe your character]", settings.style);
  const label = name.trim() || "Character";

  const generateMaster = () => {
    const { endpoint, input } = imageInput({
      prompt: masterPrompt,
      aspect: "3:4",
      resolution: settings.resolution,
      count: variations,
    });
    run([{ label: `${label} master`, kind: "image", tag: "character", endpoint, input, prompt: masterPrompt }]);
  };

  const generateSheets = () => {
    const specs: JobSpec[] = sheets.map((key) => {
      const prompt = characterPrompts[key as "turnaround" | "expressions" | "poses"](settings.style);
      const { endpoint, input } = imageInput({
        prompt,
        refImages: master,
        aspect: key === "turnaround" ? "21:9" : "1:1",
        resolution: settings.resolution === "1K" ? "2K" : settings.resolution,
      });
      return { label: `${label} ${SHEETS.find((s) => s.key === key)!.label.toLowerCase()}`, kind: "image", tag: "character", endpoint, input, prompt };
    });
    run(specs);
  };

  return (
    <div className="module">
      <ModuleHeader
        title="Character"
        intro="Design one master image first. Every sheet, frame and video after this uses it as the identity reference, so pick the one you'd cast."
      />
      <div className="module-body">
        <form className="controls" onSubmit={(e) => e.preventDefault()}>
          <h2 className="step-title">Master design</h2>
          <Field label="Name" hint="Used to label outputs in the library.">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Noa" />
          </Field>
          <Field label="Description" hint="Age, build, face, hair, outfit, materials, one signature detail.">
            <textarea
              rows={5}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="a 28-year-old woman, athletic build, short bleached hair, freckles, oversized olive bomber jacket with orange lining, cargo pants, worn white high-tops, small silver hoop in left ear"
            />
          </Field>
          <Field label="Variations">
            <input type="range" min={1} max={4} value={variations} onChange={(e) => setVariations(+e.target.value)} />
            <span className="range-value">{variations}</span>
          </Field>
          <PromptPreview prompt={masterPrompt} />
          <button type="button" className="primary" disabled={!desc.trim()} onClick={generateMaster}>
            Generate master
          </button>

          <hr />

          <h2 className="step-title">Character sheets</h2>
          <RefPicker
            label="Master reference"
            hint="Pick your chosen master from the library, or upload an existing character."
            tags={["character"]}
            value={master}
            onChange={setMaster}
          />
          <Field label="Sheets to make">
            <Chips options={SHEETS} selected={sheets} onToggle={(k) => setSheets((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} />
          </Field>
          <button type="button" className="primary" disabled={!master.length || !sheets.length} onClick={generateSheets}>
            Generate {sheets.length} sheet{sheets.length === 1 ? "" : "s"}
          </button>
          {busy && <p className="busy-note">Images take about 20–60 seconds each.</p>}
        </form>
        <ResultGrid jobs={jobs} onClear={clear} emptyText="Your character designs will appear here. Lock the one you like as a reference to reuse it in storyboards." />
      </div>
    </div>
  );
}
