// Prompt structures. This file is the "method" of the tool — edit freely.
// Every builder returns the final prompt string sent to the model.

const withStyle = (text: string, style: string) =>
  style.trim() ? `${text}\n\nVisual style (apply consistently): ${style.trim()}` : text;

// ---------- Character ----------
export const characterPrompts = {
  master: (desc: string, style: string) =>
    withStyle(
      `Full-body character design of ${desc}. Standing in a relaxed neutral pose, facing camera, entire body visible from head to feet, centered. Plain light-grey studio backdrop, soft even key light, no props, no text, no logos.`,
      style,
    ),
  turnaround: (style: string) =>
    withStyle(
      `Character turnaround sheet of the exact character in the reference image. Four full-body views side by side on one canvas: front, three-quarter, side profile, back. Identical face, hairstyle, body proportions, outfit, colors and materials in every view. Plain light-grey background, flat even lighting, consistent scale, no text labels.`,
      style,
    ),
  expressions: (style: string) =>
    withStyle(
      `Expression sheet of the exact character in the reference image. A 3x3 grid of head-and-shoulders portraits: neutral, happy, laughing, angry, sad, surprised, scared, determined, smirking. Same face, hair and outfit in every panel, same lighting, plain background, thin white gutters between panels, no text.`,
      style,
    ),
  poses: (style: string) =>
    withStyle(
      `Action pose sheet of the exact character in the reference image. A 2x2 grid of full-body dynamic poses: walking, running, reaching forward, sitting. Same face, outfit and proportions in every panel, plain background, no text.`,
      style,
    ),
};

// ---------- Environment ----------
export const ENV_ANGLES = [
  { key: "reverse", label: "Reverse angle", text: "Reverse angle: the camera has turned 180 degrees and now shows what was behind the original camera position." },
  { key: "aerial", label: "High aerial", text: "High aerial view looking down over the whole location, showing its layout." },
  { key: "ground", label: "Ground-level detail", text: "Low ground-level shot focused on one characteristic texture or object of the location, shallow depth of field." },
  { key: "side", label: "Side wide", text: "Wide shot of the main area from 90 degrees to the left of the original view." },
  { key: "interior", label: "Inside / closer", text: "Medium shot from inside the main area of the location, closer than the original." },
];

export const envPrompts = {
  establishing: (desc: string, time: string, mood: string, style: string) =>
    withStyle(
      `Cinematic establishing wide shot of ${desc}. Time of day: ${time}. Mood: ${mood}. Empty of people so it can be reused as a set. Strong sense of depth, foreground, midground and background clearly layered.`,
      style,
    ),
  angle: (angleText: string, style: string) =>
    withStyle(
      `Same location as the reference image: identical architecture, layout, materials, props, weather, lighting and time of day. ${angleText} No people.`,
      style,
    ),
};

// ---------- Storyboard ----------
export const SHOT_TYPES = [
  "Extreme wide shot",
  "Wide shot",
  "Full shot",
  "Medium shot",
  "Medium close-up",
  "Close-up",
  "Extreme close-up",
  "Over-the-shoulder shot",
  "Point-of-view shot",
  "Insert shot",
];

export const FRAME_LOOKS = {
  film: "Final-quality cinematic film still, photographic lighting, natural lens depth of field.",
  sketch: "Black-and-white pencil storyboard sketch, loose confident linework, light grey tone shading, white paper, no color.",
  animatic: "Clean greyscale animatic frame, simple shapes and values, readable silhouettes, no fine detail.",
};

export function storyboardFramePrompt(opts: {
  shotType: string;
  action: string;
  sceneContext: string;
  characterCount: number;
  hasEnvironment: boolean;
  look: keyof typeof FRAME_LOOKS;
  style: string;
  shotNumber: number;
  total: number;
}) {
  const refs: string[] = [];
  if (opts.characterCount > 0) {
    const ids = Array.from({ length: opts.characterCount }, (_, i) => `image ${i + 1}`).join(", ");
    refs.push(`Characters must match the reference ${opts.characterCount > 1 ? "images" : "image"} (${ids}) exactly: same face, hair, outfit and proportions.`);
  }
  if (opts.hasEnvironment) {
    refs.push(`The setting must match the last reference image: same location, architecture, lighting and time of day.`);
  }
  const text = [
    `Shot ${opts.shotNumber} of ${opts.total}. ${opts.shotType}.`,
    opts.sceneContext.trim() ? `Scene: ${opts.sceneContext.trim()}` : "",
    `Action: ${opts.action.trim()}`,
    ...refs,
    FRAME_LOOKS[opts.look],
    "No text, no captions, no frame borders.",
  ]
    .filter(Boolean)
    .join("\n");
  return opts.look === "film" ? withStyle(text, opts.style) : text;
}

// ---------- Camera angles ----------
export const CAMERA_ANGLES = [
  { key: "low", label: "Low angle", text: "Low angle: camera near the ground, looking up at the subject, making it feel powerful." },
  { key: "high", label: "High angle", text: "High angle: camera above the subject, looking down." },
  { key: "bird", label: "Bird's-eye", text: "Bird's-eye view: camera directly overhead, looking straight down." },
  { key: "worm", label: "Worm's-eye", text: "Worm's-eye view: camera on the floor, looking almost straight up." },
  { key: "dutch", label: "Dutch tilt", text: "Dutch angle: camera rolled about 20 degrees, creating unease." },
  { key: "ecu", label: "Extreme close-up", text: "Extreme close-up on the subject's eyes or the key detail of the scene." },
  { key: "cu", label: "Close-up", text: "Close-up: face fills most of the frame." },
  { key: "ms", label: "Medium shot", text: "Medium shot: subject framed from the waist up." },
  { key: "wide", label: "Wide shot", text: "Wide shot: subject small in frame, full environment visible." },
  { key: "ots", label: "Over the shoulder", text: "Over-the-shoulder shot from behind a second figure or foreground element, looking at the subject." },
  { key: "pov", label: "POV", text: "Point-of-view shot: what the main subject sees from their own eye position." },
  { key: "profile", label: "Profile", text: "Side profile: camera 90 degrees to the side of the subject." },
  { key: "back", label: "From behind", text: "From behind: camera behind the subject, looking where they look." },
];

export const cameraAnglePrompt = (angleText: string, extra: string) =>
  `Re-shoot the exact scene in the reference image from a new camera position. Keep the same characters, faces, wardrobe, props, location, lighting, color grade and moment in time. Only the camera changes.\nNew camera: ${angleText}${extra.trim() ? `\nNotes: ${extra.trim()}` : ""}`;

// ---------- Video motion ----------
export const CAMERA_MOVES = [
  { key: "none", label: "Let the model decide", text: "" },
  { key: "static", label: "Locked-off", text: "Camera is completely static on a tripod." },
  { key: "push", label: "Slow push-in", text: "Camera slowly pushes in toward the subject." },
  { key: "pull", label: "Pull-out reveal", text: "Camera slowly pulls back to reveal the wider scene." },
  { key: "orbitL", label: "Orbit left", text: "Camera orbits smoothly to the left around the subject." },
  { key: "orbitR", label: "Orbit right", text: "Camera orbits smoothly to the right around the subject." },
  { key: "crane", label: "Crane up", text: "Camera cranes up and rises above the scene." },
  { key: "track", label: "Tracking", text: "Camera tracks alongside the subject as it moves." },
  { key: "handheld", label: "Handheld", text: "Handheld camera with subtle natural shake, documentary feel." },
  { key: "dolly", label: "Dolly zoom", text: "Dolly zoom: camera moves back while zooming in, background stretches." },
];

export function motionPrompt(action: string, moveKey: string, style: string) {
  const move = CAMERA_MOVES.find((m) => m.key === moveKey)?.text ?? "";
  const text = [action.trim(), move ? `Camera: ${move}` : ""].filter(Boolean).join("\n");
  return withStyle(text, style);
}
