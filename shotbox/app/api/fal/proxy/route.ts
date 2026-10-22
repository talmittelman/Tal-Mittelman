import { createRouteHandler } from "@fal-ai/server-proxy/nextjs";
import { ALLOWED_ENDPOINTS } from "@/lib/models";

// Adds FAL_KEY server-side and forwards requests to fal.
// Only the models listed in lib/models.ts can be called through it.
export const { GET, POST, PUT } = createRouteHandler({
  allowedEndpoints: ALLOWED_ENDPOINTS,
  allowedUrlPatterns: [
    "fal.run/**",
    "queue.fal.run/**",
    // file uploads (multipart is used for large videos)
    "rest.fal.ai/storage/upload/initiate\\?storage_type=fal-cdn-v3",
    "rest.fal.ai/storage/upload/initiate-multipart\\?storage_type=fal-cdn-v3",
    "rest.fal.ai/storage/upload/complete-multipart\\?storage_type=fal-cdn-v3",
  ],
  allowUnauthorizedRequests: true, // access is gated by middleware.ts instead
});

export const maxDuration = 60;
