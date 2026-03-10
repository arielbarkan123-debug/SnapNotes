/**
 * Post-processing pipeline for diagram images.
 *
 * Normalizes output from ALL 4 pipelines into a consistent format:
 * - Always returns base64 data URL (data:image/png;base64,...)
 * - Trims surrounding whitespace
 * - Caps max dimension to 1600px (retina-ready without being massive)
 * - Ensures white background (removes transparency)
 *
 * Uses `sharp` (already installed in Next.js projects) for image manipulation.
 */

import sharp from 'sharp';
import type { Pipeline } from './router';
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:post-process')

/** Max pixel dimension for the longest side (width or height) */
const MAX_DIMENSION = 1600;

/**
 * Post-process a diagram image from any pipeline into a normalized format.
 *
 * @param imageBase64OrUrl - Either a `data:image/png;base64,...` string or an HTTP URL
 * @param _pipeline - Which pipeline produced the image (for future per-pipeline tuning)
 * @returns Normalized `data:image/png;base64,...` string
 */
export async function postProcessDiagram(
  imageBase64OrUrl: string,
  _pipeline: Pipeline,
): Promise<string> {
  try {
    // Step 1: Get raw image buffer
    let buffer: Buffer;

    if (imageBase64OrUrl.startsWith('data:image/')) {
      // Base64 data URL (E2B output, Recraft composite)
      const base64Data = imageBase64OrUrl.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(base64Data, 'base64');
    } else if (imageBase64OrUrl.startsWith('http')) {
      // HTTP URL (TikZ/QuickLaTeX CDN)
      const response = await fetch(imageBase64OrUrl);
      if (!response.ok) {
        log.warn({ status: response.status }, 'Failed to fetch image');
        return imageBase64OrUrl; // Return original on fetch failure
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      // Unknown format — return as-is
      return imageBase64OrUrl;
    }

    // Step 2: Process with sharp
    const processed = await sharp(buffer)
      // Flatten transparency to white background
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      // Trim surrounding whitespace (with a small threshold for anti-aliased edges)
      .trim({ threshold: 20 })
      // Cap max dimension (don't enlarge small images)
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      // Output as PNG
      .png({ quality: 100, compressionLevel: 6 })
      .toBuffer();

    // Step 3: Convert back to data URL
    return `data:image/png;base64,${processed.toString('base64')}`;
  } catch (err) {
    log.error({ err: err }, 'Error processing image, returning original:');
    // Never block diagram delivery — return the original on any error
    return imageBase64OrUrl;
  }
}
