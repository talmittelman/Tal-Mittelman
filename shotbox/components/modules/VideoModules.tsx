"use client";

import { useEffect, useState } from "react";
import { I2V_MODELS, ModelDef, T2V_MODELS, V2V_MODELS } from "@/lib/models";
import { CAMERA_MOVES, motionPrompt } from "@/lib/prompts";
import { useJobs, useStudio } from "@/lib/store";
import { Field, ModuleHeader, PromptPreview, RefPicker, ResultGrid, Select } from "../ui";

function useModelSettings(models: ModelDef[]) {
  const [modelId, setModelId] = useState(models[0].id);
  const model = models.find((m) => m.id === modelId)!;
  const [duration, setDuration] = useState(model.durations[0] ?? "");
  const [resolution, setResolution] = useState(model.resolutions.includes("720p") ? "720p" : model.resolutions[0] ?? "");
  const [aspect, setAspect] = useState(model.aspects[0] ?? "");
  const [audio, setAudio] = useState(true);

  useEffect(() => {
    if (!model.durations.includes(duration)) setDuration(model.durations[0] ?? "");
    if (!model.resolutions.includes(resolution)) setResolution(model.resolutions.includes("720p") ? "720p" : model.resolutions[0] ?? "");
    if (!model.aspects.includes(aspect)) setAspect(model.aspects[0] ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const controls = (
    <>
      <Field label="Model" hint={model.note}>
        <Select value={modelId} onChange={setModelId} options={models.map((m) => ({ value: m.id, label: m.label }))} />
      </Field>
      {(model.durations.length > 0 || model.resolutions.length > 0) && (
        <div className="field-pair">
          {model.durations.length > 0 && (
            <Field label="Duration">
              <Select value={duration} onChange={setDuration} options={model.durations.map((d) => ({ value: d, label: d === "auto" ? "Auto" : d.endsWith("s") ? d : `${d}s` }))} />
            </Field>
          )}
          {model.resolutions.length > 0 && (
            <Field label="Resolution">
              <Select value={resolution} onChange={setResolution} options={model.resolutions} />
            </Field>
          )}
        </div>
      )}
      {model.aspects.length > 0 && (
        <Field label="Aspect">
          <Select value={aspect} onChange={setAspect} options={model.aspects.map((a) => ({ value: a, label: a === "auto" ? "Match image" : a }))} />
        </Field>
      )}
      {model.supportsAudio && (
        <label className="toggle">
          <input type="checkbox" checked={audio} onChange={(e) => setAudio(e.target.checked)} />
          <span>Generate sound (ambience, effects, dialogue)</span>
        </label>
      )}
    </>
  );

  return { model, duration, resolution, aspect, audio, controls };
}

const VIDEO_WAIT = "Video takes 1–5 minutes. You can switch modules; this keeps running.";

// ---------- Image → Video ----------
export function ImageToVideo() {
  const { settings, consumeHandoff } = useStudio();
  const { jobs, run, clear, busy } = useJobs();
  const [start, setStart] = useState<string[]>([]);
  const [end, setEnd] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [move, setMove] = useState("push");
  const [takes, setTakes] = useState(1);
  const m = useModelSettings(I2V_MODELS);

  useEffect(() => {
    const url = consumeHandoff("i2v");
    if (url) setStart([url]);
  }, [consumeHandoff]);

  const prompt = motionPrompt(action || "[what moves in the shot]", move, settings.style);

  const generate = () => {
    const input = m.model.build({
      prompt,
      imageUrl: start[0],
      endImageUrl: m.model.supportsEndFrame ? end[0] : undefined,
      duration: m.duration || undefined,
      resolution: m.resolution || undefined,
      aspect: m.aspect || undefined,
      audio: m.audio,
    });
    run(
      Array.from({ length: takes }, (_, i) => ({
        label: `${m.model.label}${takes > 1 ? `, take ${i + 1}` : ""}`,
        kind: "video" as const,
        tag: "video" as const,
        endpoint: m.model.id,
        input: { ...input },
        prompt,
      })),
    );
  };

  return (
    <div className="module">
      <ModuleHeader title="Image to video" intro="Animate an approved frame. Describe the action, pick a camera move, and add an end frame when you need to land on an exact composition." />
      <div className="module-body">
        <form className="controls" onSubmit={(e) => e.preventDefault()}>
          <RefPicker label="Start frame" value={start} onChange={setStart} />
          {m.model.supportsEndFrame && <RefPicker label="End frame" hint="Optional. The clip will transition into this image." value={end} onChange={setEnd} />}
          <Field label="Action" hint="What moves: subject, environment, light. One beat per clip works best.">
            <textarea rows={4} value={action} onChange={(e) => setAction(e.target.value)} placeholder="She pops the board, it flips once under her feet and she lands clean, arms out, grinning. Hair and jacket move with the wind." />
          </Field>
          <Field label="Camera move">
            <Select value={move} onChange={setMove} options={CAMERA_MOVES.map((c) => ({ value: c.key, label: c.label }))} />
          </Field>
          {m.controls}
          <Field label="Takes">
            <input type="range" min={1} max={4} value={takes} onChange={(e) => setTakes(+e.target.value)} />
            <span className="range-value">{takes}</span>
          </Field>
          <PromptPreview prompt={prompt} />
          <button type="button" className="primary" disabled={!start.length || !action.trim()} onClick={generate}>
            Animate {takes > 1 ? `${takes} takes` : "frame"}
          </button>
          {busy && <p className="busy-note">{VIDEO_WAIT}</p>}
        </form>
        <ResultGrid jobs={jobs} onClear={clear} wide emptyText="Clips appear here when they finish. Multiple takes of the same frame make it easier to pick the best motion." />
      </div>
    </div>
  );
}

// ---------- Text → Video ----------
export function TextToVideo() {
  const { settings } = useStudio();
  const { jobs, run, clear, busy } = useJobs();
  const [action, setAction] = useState("");
  const [move, setMove] = useState("none");
  const m = useModelSettings(T2V_MODELS);

  const prompt = motionPrompt(action || "[describe the shot]", move, settings.style);

  const generate = () => {
    const input = m.model.build({
      prompt,
      duration: m.duration || undefined,
      resolution: m.resolution || undefined,
      aspect: m.aspect || undefined,
      audio: m.audio,
    });
    run([{ label: m.model.label, kind: "video", tag: "video", endpoint: m.model.id, input, prompt }]);
  };

  return (
    <div className="module">
      <ModuleHeader title="Text to video" intro="For quick concept tests and B-roll. For anything with a recurring character, build the frame first and use Image to video instead." />
      <div className="module-body">
        <form className="controls" onSubmit={(e) => e.preventDefault()}>
          <Field label="Shot" hint="Subject, action, setting, lens, light, sound. Write it like a director's note.">
            <textarea rows={6} value={action} onChange={(e) => setAction(e.target.value)} placeholder="Low tracking shot following a skateboard rolling down an empty Tel Aviv street at dawn, wheels clacking over pavement seams, warm light flaring through the trees." />
          </Field>
          <Field label="Camera move">
            <Select value={move} onChange={setMove} options={CAMERA_MOVES.map((c) => ({ value: c.key, label: c.label }))} />
          </Field>
          {m.controls}
          <PromptPreview prompt={prompt} />
          <button type="button" className="primary" disabled={!action.trim()} onClick={generate}>
            Generate clip
          </button>
          {busy && <p className="busy-note">{VIDEO_WAIT}</p>}
        </form>
        <ResultGrid jobs={jobs} onClear={clear} wide emptyText="Clips appear here when they finish." />
      </div>
    </div>
  );
}

// ---------- Video → Video ----------
export function VideoToVideo() {
  const { consumeHandoff } = useStudio();
  const { jobs, run, clear, busy } = useJobs();
  const [video, setVideo] = useState<string[]>([]);
  const [refs, setRefs] = useState<string[]>([]);
  const [instruction, setInstruction] = useState("");
  const [keepAudio, setKeepAudio] = useState(true);
  const m = useModelSettings(V2V_MODELS);

  useEffect(() => {
    const url = consumeHandoff("v2v");
    if (url) setVideo([url]);
  }, [consumeHandoff]);

  const prompt = instruction.trim() || "[what to change]";

  const generate = () => {
    const input = m.model.build({ prompt, videoUrl: video[0], refImages: refs, keepAudio });
    run([{ label: m.model.label, kind: "video", tag: "video", endpoint: m.model.id, input, prompt }]);
  };

  return (
    <div className="module">
      <ModuleHeader
        title="Video to video"
        intro="Keep the motion and timing of a clip, change what's in it: wardrobe, set, time of day or the whole style. Great for turning gameplay or phone footage into a finished look."
      />
      <div className="module-body">
        <form className="controls" onSubmit={(e) => e.preventDefault()}>
          <RefPicker label="Source clip" hint="MP4 or MOV, 3–15 seconds, at least 720px." kind="video" value={video} onChange={setVideo} />
          <RefPicker
            label="Look references"
            hint="Optional, up to 4. Refer to them as @Image1, @Image2 in the instruction."
            multiple
            max={4}
            value={refs}
            onChange={setRefs}
          />
          <Field label="Instruction" hint="Say what changes and what must stay. The source clip is @Video1.">
            <textarea rows={5} value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="Restyle @Video1 to match @Image1: snowy alpine town at dusk, warm window light. Keep the skater's motion and camera path exactly." />
          </Field>
          {m.controls}
          <label className="toggle">
            <input type="checkbox" checked={keepAudio} onChange={(e) => setKeepAudio(e.target.checked)} />
            <span>Keep the original audio</span>
          </label>
          <button type="button" className="primary" disabled={!video.length || !instruction.trim()} onClick={generate}>
            Transform clip
          </button>
          {busy && <p className="busy-note">{VIDEO_WAIT}</p>}
        </form>
        <ResultGrid jobs={jobs} onClear={clear} wide emptyText="Transformed clips appear here." />
      </div>
    </div>
  );
}
