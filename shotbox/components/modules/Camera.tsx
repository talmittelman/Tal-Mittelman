"use client";

import { useEffect, useState } from "react";
import { imageInput } from "@/lib/models";
import { CAMERA_ANGLES, cameraAnglePrompt } from "@/lib/prompts";
import { useJobs, useStudio } from "@/lib/store";
import { Chips, Field, ModuleHeader, PromptPreview, RefPicker, ResultGrid } from "../ui";

export default function Camera() {
  const { settings, consumeHandoff } = useStudio();
  const { jobs, run, clear, busy } = useJobs();
  const [source, setSource] = useState<string[]>([]);
  const [extraRefs, setExtraRefs] = useState<string[]>([]);
  const [angles, setAngles] = useState<string[]>(["low", "high", "ots", "cu"]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const url = consumeHandoff("camera");
    if (url) setSource([url]);
  }, [consumeHandoff]);

  const first = CAMERA_ANGLES.find((a) => a.key === angles[0]);

  const generate = () => {
    run(
      angles.map((key) => {
        const a = CAMERA_ANGLES.find((x) => x.key === key)!;
        const prompt = cameraAnglePrompt(a.text, notes);
        const { endpoint, input } = imageInput({
          prompt,
          refImages: [...source, ...extraRefs],
          aspect: "auto",
          resolution: settings.resolution,
        });
        return { label: a.label, kind: "image" as const, tag: "angle" as const, endpoint, input, prompt };
      }),
      4,
    );
  };

  return (
    <div className="module">
      <ModuleHeader
        title="Camera angles"
        intro="Keep the moment, move the camera. Use it to cover a scene before animating, or to fix a storyboard frame that's framed wrong."
      />
      <div className="module-body">
        <form className="controls" onSubmit={(e) => e.preventDefault()}>
          <RefPicker label="Frame to re-shoot" value={source} onChange={setSource} />
          <RefPicker
            label="Extra identity references"
            hint="Optional. Add the character master if faces drift on extreme angles."
            multiple
            max={3}
            tags={["character"]}
            value={extraRefs}
            onChange={setExtraRefs}
          />
          <Field label="Angles">
            <Chips options={CAMERA_ANGLES} selected={angles} onToggle={(k) => setAngles((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))} />
          </Field>
          <Field label="Director's notes" hint="Optional. Applies to every angle.">
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="35mm lens, keep the sunset behind her" />
          </Field>
          {first && <PromptPreview prompt={cameraAnglePrompt(first.text, notes)} />}
          <button type="button" className="primary" disabled={!source.length || !angles.length} onClick={generate}>
            Shoot {angles.length} angle{angles.length === 1 ? "" : "s"}
          </button>
          {busy && <p className="busy-note">Images take about 20–60 seconds each.</p>}
        </form>
        <ResultGrid jobs={jobs} onClear={clear} wide emptyText="Pick a frame and the angles you need. Each angle comes back as its own image." />
      </div>
    </div>
  );
}
