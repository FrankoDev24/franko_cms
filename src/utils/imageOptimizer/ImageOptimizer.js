/**
 * imageOptimizer — reusable client-side image optimization pipeline.
 *
 * Flow (optimize BEFORE upload):
 *   validate → read size + dimensions → resize (aspect-safe, no upscale)
 *   → compress → encode REAL WebP → return a File named *.webp with
 *   Content-Type: image/webp.
 *
 * Only browser APIs are used (createImageBitmap / <img> + canvas.toBlob) —
 * no new dependencies. The result is a plain File that plugs into the EXISTING
 * multipart upload endpoints unchanged (Product-Post, Product-Image-Edit,
 * AddProductImages, ...); the backend keeps storing the reference/URL.
 *
 * The public functions are pure enough to reuse later for a migration of
 * existing JPG/PNG assets (fetch → optimizeImage → re-upload → update URL).
 */

import {
  IMAGE_PROFILES,
  AGGRESSIVE_THRESHOLD_BYTES,
  DEFAULT_PROFILE,
} from "./profiles.js";

/* =========================== constants =========================== */

/** Only these MIME types are accepted (validation requirement). */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Reject absurd sources before decoding (resource protection). */
export const MAX_SOURCE_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_SOURCE_DIMENSION = 12000; // px, per side

/** Output is always real WebP. */
export const OUTPUT_MIME = "image/webp";

/* =========================== small helpers =========================== */

export const formatBytes = (bytes, digits = 1) => {
  if (!Number.isFinite(bytes) || bytes < 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 100 ? 0 : digits)} ${units[i]}`;
};

export const typeLabel = (mimeType) => {
  if (mimeType === "image/jpeg") return "JPG";
  if (mimeType === "image/png") return "PNG";
  if (mimeType === "image/webp") return "WebP";
  return (mimeType || "image").replace("image/", "").toUpperCase();
};

/**
 * iphone-16.jpg → iphone-16.webp  (real rename of a real WebP encoding,
 * never a blind extension swap).
 */
export const toWebpName = (fileName) => {
  const base = String(fileName || "")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "image"}.webp`;
};

const fail = (message) => ({ ok: false, message });

/* =========================== validation =========================== */

/**
 * Cheap pre-flight validation (type + byte size) — no decoding.
 * Returns { ok: true } or { ok: false, message } with a user-facing message.
 */
export const validateImageFile = (file) => {
  if (!file) return fail("No file selected.");

  const type = String(file.type || "").toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(type)) {
    return fail(
      `"${file.name || "file"}" is not a supported image. Please use JPG, PNG, or WebP.`
    );
  }

  if (file.size > MAX_SOURCE_BYTES) {
    return fail(
      `"${file.name}" is ${formatBytes(file.size)} — the maximum accepted size is ${formatBytes(MAX_SOURCE_BYTES)}.`
    );
  }

  if (file.size === 0) {
    return fail(`"${file.name}" is empty (0 bytes) — the file may be corrupt.`);
  }

  return { ok: true };
};

/* =========================== decoding =========================== */

const decodeViaBitmap = async (file) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => {
      if (typeof bitmap.close === "function") bitmap.close();
    },
  };
};

const decodeViaImageElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      resolve({
        source: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read the image — the file may be corrupt."));
    };
    img.src = url;
  });

const decodeImage = async (file) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await decodeViaBitmap(file);
    } catch {
      /* fall through to <img> decoding */
    }
  }
  return decodeViaImageElement(file);
};

/* =========================== encoding =========================== */

const dataUrlToBlob = (dataUrl) => {
  const [meta, body] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);/)?.[1] || OUTPUT_MIME;
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

const encodeWebp = (canvas, quality) =>
  new Promise((resolve, reject) => {
    const finish = (blob) => {
      if (!blob) {
        reject(new Error("Image encoding failed — the browser returned no data."));
        return;
      }
      if (blob.type && blob.type !== OUTPUT_MIME) {
        // Old Safari silently encoded PNG/JPEG instead of WebP.
        reject(
          new Error(
            "This browser cannot encode WebP images. Please use an up-to-date Chrome, Edge, Firefox, or Safari (16.4+)."
          )
        );
        return;
      }
      resolve(blob);
    };

    if (typeof canvas.toBlob === "function") {
      canvas.toBlob(finish, OUTPUT_MIME, quality);
    } else {
      try {
        finish(dataUrlToBlob(canvas.toDataURL(OUTPUT_MIME, quality)));
      } catch (error) {
        reject(error);
      }
    }
  });

/* =========================== profile resolution =========================== */

const resolveOptions = (options = {}) => {
  const base =
    (typeof options.profile === "string" && IMAGE_PROFILES[options.profile]) ||
    (options.profile && typeof options.profile === "object" && options.profile) ||
    IMAGE_PROFILES[DEFAULT_PROFILE];
  return { ...base, ...options };
};

/* =========================== core API =========================== */

/**
 * Read a file's size + dimensions (validation included).
 * Useful to show "4000 × 4000 PNG · 3.2 MB" before/while optimizing.
 */
export const inspectImage = async (file) => {
  const validation = validateImageFile(file);
  if (!validation.ok) throw new Error(validation.message);

  const decoded = await decodeImage(file);
  try {
    const { width, height } = decoded;
    if (!width || !height) {
      throw new Error("Could not determine image dimensions — the file may be corrupt.");
    }
    if (width > MAX_SOURCE_DIMENSION || height > MAX_SOURCE_DIMENSION) {
      throw new Error(
        `"${file.name}" is ${width} × ${height} px — the maximum supported dimension is ${MAX_SOURCE_DIMENSION}px per side.`
      );
    }
    return {
      name: file.name,
      type: file.type,
      size: file.size,
      width,
      height,
    };
  } finally {
    decoded.release();
  }
};

/**
 * Optimize ONE image: validate → measure → resize (aspect-safe) → compress →
 * encode WebP → return a File ready for the existing upload endpoints.
 *
 * @param {File|Blob} file             source JPG / PNG / WebP
 * @param {object}    options          { profile: "PRODUCT"|"CMS"|"HERO"|{...},
 *                                      maxWidth, maxHeight, quality,
 *                                      targetMaxBytes } — explicit options
 *                                      override the profile.
 * @returns {Promise<object>} {
 *   file, name,
 *   original: { name, type, size, width, height },
 *   result:   { name, type, size, width, height },
 *   savedBytes, savingsPercent, resized, aggressive, quality
 * }
 * @throws {Error} with a user-facing message on validation/optimization failure.
 */
export const optimizeImage = async (file, options = {}) => {
  const opts = resolveOptions(options);

  const validation = validateImageFile(file);
  if (!validation.ok) throw new Error(validation.message);

  const decoded = await decodeImage(file);
  try {
    const srcW = decoded.width;
    const srcH = decoded.height;

    if (!srcW || !srcH) {
      throw new Error("Could not determine image dimensions — the file may be corrupt.");
    }
    if (srcW > MAX_SOURCE_DIMENSION || srcH > MAX_SOURCE_DIMENSION) {
      throw new Error(
        `"${file.name}" is ${srcW} × ${srcH} px — the maximum supported dimension is ${MAX_SOURCE_DIMENSION}px per side.`
      );
    }

    // Fit inside the bounding box; aspect ratio preserved; never upscaled.
    const scale = Math.min(1, opts.maxWidth / srcW, opts.maxHeight / srcH);
    const targetW = Math.max(1, Math.round(srcW * scale));
    const targetH = Math.max(1, Math.round(srcH * scale));

    const aggressive = file.size >= AGGRESSIVE_THRESHOLD_BYTES;
    const webpName = toWebpName(file.name);

    // Pass-through: an already-small WebP inside the box needs no re-encode.
    if (
      file.type === OUTPUT_MIME &&
      scale === 1 &&
      file.size <= opts.targetMaxBytes
    ) {
      const passthrough =
        typeof File === "function"
          ? new File([file], webpName, { type: OUTPUT_MIME, lastModified: Date.now() })
          : file;
      return {
        file: passthrough,
        name: webpName,
        original: { name: file.name, type: file.type, size: file.size, width: srcW, height: srcH },
        result: { name: webpName, type: OUTPUT_MIME, size: passthrough.size, width: srcW, height: srcH },
        savedBytes: 0,
        savingsPercent: 0,
        resized: false,
        aggressive,
        quality: 1,
        passthrough: true,
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // No background fill: PNG transparency carries into the WebP output.
    ctx.drawImage(decoded.source, 0, 0, targetW, targetH);

    // Quality ladder: first pass at profile quality (aggressive sources start
    // lower), step down until the output fits the target size.
    const ladder = aggressive
      ? [Math.min(opts.quality, 0.72), 0.62, 0.52]
      : [opts.quality, 0.72, 0.62];

    let best = null;
    let usedQuality = ladder[0];
    for (const quality of ladder) {
      const blob = await encodeWebp(canvas, quality);
      if (!best || blob.size < best.size) {
        best = blob;
        usedQuality = quality;
      }
      if (blob.size <= opts.targetMaxBytes) {
        best = blob;
        usedQuality = quality;
        break;
      }
    }

    const webpFile =
      typeof File === "function"
        ? new File([best], webpName, { type: OUTPUT_MIME, lastModified: Date.now() })
        : Object.assign(best, { name: webpName });

    return {
      file: webpFile,
      name: webpName,
      original: {
        name: file.name,
        type: file.type,
        size: file.size,
        width: srcW,
        height: srcH,
      },
      result: {
        name: webpName,
        type: OUTPUT_MIME,
        size: webpFile.size,
        width: targetW,
        height: targetH,
      },
      savedBytes: Math.max(0, file.size - webpFile.size),
      savingsPercent: file.size
        ? Math.max(0, Math.round((1 - webpFile.size / file.size) * 100))
        : 0,
      resized: scale < 1,
      aggressive,
      quality: usedQuality,
    };
  } finally {
    decoded.release();
  }
};

/**
 * Optimize a batch sequentially (keeps the UI responsive). Never throws —
 * returns per-item outcomes so callers can report partial success.
 *
 * @returns {Promise<{ results: object[], errors: { file: File, message: string }[] }>}
 */
export const optimizeImages = async (files, options = {}) => {
  const list = Array.isArray(files) ? files : [files];
  const results = [];
  const errors = [];

  for (const file of list) {
    try {
      results.push(await optimizeImage(file, options));
    } catch (error) {
      errors.push({ file, message: error?.message || "Image optimization failed." });
    }
  }

  return { results, errors };
};

/* =========================== formatting =========================== */

/** "3.2 MB → 142 KB (−96%)" — handy for the CMS UI. */
export const formatOptimizationSummary = (optimized) => {
  if (!optimized) return "";
  const from = formatBytes(optimized.original.size);
  const to = formatBytes(optimized.result.size);
  const dims =
    optimized.original.width === optimized.result.width &&
    optimized.original.height === optimized.result.height
      ? `${optimized.result.width} × ${optimized.result.height}`
      : `${optimized.original.width} × ${optimized.original.height} → ${optimized.result.width} × ${optimized.result.height}`;
  const saved =
    optimized.savingsPercent > 0 ? ` (−${optimized.savingsPercent}%)` : "";
  return `${dims} · ${typeLabel(optimized.original.type)} ${from} → WebP ${to}${saved}`;
};
