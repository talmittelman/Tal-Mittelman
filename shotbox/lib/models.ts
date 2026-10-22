// Every model the app calls lives here. To swap a model, change its `id`
// (the fal endpoint string) and, if its inputs differ, its `build` function.
// Browse endpoints at https://fal.ai/models — each model page lists its input schema.

export type GenParams = {
  prompt: string;
  imageUrl?: string;
  endImageUrl?: string;
  videoUrl?: string;
  refImages?: string[];
  duration?: string;
  aspect?: string;
  resolution?: string;
  audio?: boolean;
  keepAudio?: boolean;
};

export type ModelDef = {
  id: string;
  label: string;
  note: string;
  durations: string[];
  resolutions: string[];
  aspects: string[];
  supportsEndFrame?: boolean;
  supportsAudio?: boolean;
  build: (p: GenParams) => Record<string, unknown>;
};

// ---------- Images ----------
// Nano Banana Pro: strongest character/scene consistency from reference images.
export const IMAGE_MODELS = {
  generate: "fal-ai/nano-banana-pro",
  edit: "fal-ai/nano-banana-pro/edit",
};

export const IMAGE_ASPECTS = ["16:9", "21:9", "9:16", "4:5", "1:1", "3:2", "2:3"];
export const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"];

export function imageInput(p: GenParams & { count?: number }) {
  const base: Record<string, unknown> = {
    prompt: p.prompt,
    num_images: p.count ?? 1,
    aspect_ratio: p.aspect ?? "16:9",
    resolution: p.resolution ?? "1K",
    output_format: "png",
  };
  if (p.refImages && p.refImages.length) {
    return { endpoint: IMAGE_MODELS.edit, input: { ...base, image_urls: p.refImages } };
  }
  return { endpoint: IMAGE_MODELS.generate, input: base };
}

// ---------- Video ----------
const SEEDANCE_DUR = ["auto", "4", "5", "6", "8", "10", "12", "15"];
const SEEDANCE_AR = ["auto", "16:9", "21:9", "9:16", "4:3", "1:1", "3:4"];

const seedanceI2V = (p: GenParams) => ({
  prompt: p.prompt,
  image_url: p.imageUrl,
  ...(p.endImageUrl ? { end_image_url: p.endImageUrl } : {}),
  duration: p.duration ?? "auto",
  aspect_ratio: p.aspect ?? "auto",
  resolution: p.resolution ?? "720p",
  generate_audio: p.audio ?? true,
});

const seedanceT2V = (p: GenParams) => ({
  prompt: p.prompt,
  duration: p.duration ?? "auto",
  aspect_ratio: p.aspect && p.aspect !== "auto" ? p.aspect : "16:9",
  resolution: p.resolution ?? "720p",
  generate_audio: p.audio ?? true,
});

export const I2V_MODELS: ModelDef[] = [
  {
    id: "bytedance/seedance-2.0/image-to-video",
    label: "Seedance 2.0",
    note: "Best cinematic motion, native audio, start + end frame",
    durations: SEEDANCE_DUR,
    resolutions: ["480p", "720p", "1080p"],
    aspects: SEEDANCE_AR,
    supportsEndFrame: true,
    supportsAudio: true,
    build: seedanceI2V,
  },
  {
    id: "bytedance/seedance-2.0/fast/image-to-video",
    label: "Seedance 2.0 Fast",
    note: "Cheaper drafts, max 720p",
    durations: SEEDANCE_DUR,
    resolutions: ["480p", "720p"],
    aspects: SEEDANCE_AR,
    supportsEndFrame: true,
    supportsAudio: true,
    build: seedanceI2V,
  },
  {
    id: "fal-ai/kling-video/v3/pro/image-to-video",
    label: "Kling 3.0 Pro",
    note: "Strong physics and character motion",
    durations: ["5", "10"],
    resolutions: [],
    aspects: [],
    build: (p) => ({ prompt: p.prompt, start_image_url: p.imageUrl, duration: p.duration ?? "5" }),
  },
];

export const T2V_MODELS: ModelDef[] = [
  {
    id: "bytedance/seedance-2.0/text-to-video",
    label: "Seedance 2.0",
    note: "Top-rated text-to-video, director-level camera control",
    durations: SEEDANCE_DUR,
    resolutions: ["480p", "720p", "1080p"],
    aspects: SEEDANCE_AR.filter((a) => a !== "auto"),
    supportsAudio: true,
    build: seedanceT2V,
  },
  {
    id: "bytedance/seedance-2.0/fast/text-to-video",
    label: "Seedance 2.0 Fast",
    note: "Cheaper drafts, max 720p",
    durations: SEEDANCE_DUR,
    resolutions: ["480p", "720p"],
    aspects: SEEDANCE_AR.filter((a) => a !== "auto"),
    supportsAudio: true,
    build: seedanceT2V,
  },
  {
    id: "fal-ai/veo3.1",
    label: "Veo 3.1",
    note: "Google, up to 1080p with lip-synced dialogue",
    durations: ["4s", "6s", "8s"],
    resolutions: ["720p", "1080p"],
    aspects: ["16:9", "9:16"],
    supportsAudio: true,
    build: (p) => ({
      prompt: p.prompt,
      duration: p.duration ?? "8s",
      aspect_ratio: p.aspect ?? "16:9",
      resolution: p.resolution ?? "720p",
      generate_audio: p.audio ?? true,
    }),
  },
];

const klingV2V = (p: GenParams) => ({
  prompt: p.prompt,
  video_url: p.videoUrl,
  ...(p.refImages && p.refImages.length ? { image_urls: p.refImages.slice(0, 4) } : {}),
  keep_audio: p.keepAudio ?? true,
});

export const V2V_MODELS: ModelDef[] = [
  {
    id: "fal-ai/kling-video/o3/pro/video-to-video/edit",
    label: "Kling O3 Edit Pro",
    note: "Keeps motion, changes subject, setting or style. Clips 3–15s",
    durations: [],
    resolutions: [],
    aspects: [],
    build: klingV2V,
  },
  {
    id: "fal-ai/kling-video/o3/standard/video-to-video/edit",
    label: "Kling O3 Edit Standard",
    note: "Cheaper version of the same edit. Clips 3–10s",
    durations: [],
    resolutions: [],
    aspects: [],
    build: klingV2V,
  },
];

// The server proxy only forwards calls to these endpoints, so a leaked URL
// can't be used to run other (expensive) models on your key.
export const ALLOWED_ENDPOINTS = [
  IMAGE_MODELS.generate,
  IMAGE_MODELS.edit,
  ...I2V_MODELS.map((m) => m.id),
  ...T2V_MODELS.map((m) => m.id),
  ...V2V_MODELS.map((m) => m.id),
];
