"use client";

import { fal } from "@fal-ai/client";

// All requests go through our own server route, which adds the FAL_KEY.
// The key never reaches the browser.
fal.config({ proxyUrl: "/api/fal/proxy" });

export type RunStatus = "queued" | "running";

export async function runModel(
  endpoint: string,
  input: Record<string, unknown>,
  onStatus?: (s: RunStatus) => void,
): Promise<any> {
  const result = await fal.subscribe(endpoint, {
    input,
    logs: false,
    onQueueUpdate: (u) => onStatus?.(u.status === "IN_QUEUE" ? "queued" : "running"),
  });
  return result.data;
}

export async function uploadFile(file: File): Promise<string> {
  return fal.storage.upload(file);
}

export function extractUrls(data: any): string[] {
  if (data?.images?.length) return data.images.map((i: any) => i.url);
  if (data?.video?.url) return [data.video.url];
  if (data?.image?.url) return [data.image.url];
  return [];
}

export function errorMessage(e: any): string {
  const detail = e?.body?.detail;
  if (Array.isArray(detail)) return detail.map((d: any) => d.msg ?? JSON.stringify(d)).join("; ");
  if (typeof detail === "string") return detail;
  if (e?.status === 401 || e?.status === 403) return "fal rejected the API key. Check FAL_KEY in your environment.";
  return e?.message ?? "Generation failed.";
}

// Run async tasks with a concurrency limit.
export async function pool<T>(tasks: (() => Promise<T>)[], limit = 3): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (i < tasks.length) {
      const t = tasks[i++];
      await t();
    }
  });
  await Promise.all(workers);
}
