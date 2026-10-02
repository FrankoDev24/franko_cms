/**
 * utils/imageOptimizer — public API.
 *
 * Usage (any CMS upload component):
 *
 *   import { optimizeImage, IMAGE_PROFILES, formatOptimizationSummary }
 *     from "../../../utils/imageOptimizer";
 *
 *   const optimized = await optimizeImage(file, { profile: "PRODUCT" });
 *   // upload optimized.file ONLY — it is a real .webp File with
 *   // Content-Type: image/webp, ready for the existing multipart endpoints.
 *
 * Profiles: PRODUCT (800×800) · CMS (1200px longest side) · HERO (1600px).
 * See IMPLEMENTATION.md for the full architecture and migration notes.
 */
export {
  ALLOWED_IMAGE_TYPES,
  MAX_SOURCE_BYTES,
  MAX_SOURCE_DIMENSION,
  OUTPUT_MIME,
  formatBytes,
  typeLabel,
  toWebpName,
  validateImageFile,
  inspectImage,
  optimizeImage,
  optimizeImages,
  formatOptimizationSummary,
} from "./imageOptimizer.js";

export {
  IMAGE_PROFILES,
  AGGRESSIVE_THRESHOLD_BYTES,
  DEFAULT_PROFILE,
} from "./profiles.js";
