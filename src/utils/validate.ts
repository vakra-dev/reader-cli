/**
 * Input validation for the Reader CLI.
 *
 * All validation runs before API calls to fail fast and give clear errors.
 */

import { info, error } from "./output.js";

const VALID_FORMATS = ["markdown", "html", "screenshot"] as const;
type Format = (typeof VALID_FORMATS)[number];

/**
 * Normalize a URL string for the Reader API.
 *
 * - Auto-prepends https:// when no protocol is present
 * - Validates the result is a parseable URL
 */
export function normalizeUrl(url: string): string {
  let normalized = url;

  if (!url.includes("://")) {
    normalized = `https://${url}`;
    info(`Normalized URL: ${url} -> ${normalized}`);
  }

  try {
    new URL(normalized);
  } catch {
    error(`Invalid URL: "${url}". Expected format: https://example.com`);
    process.exit(1);
  }

  return normalized;
}

/**
 * Parse and validate a positive integer from a CLI option string.
 */
export function parsePositiveInt(value: string, name: string): number {
  const n = parseInt(value, 10);
  if (isNaN(n) || n <= 0) {
    error(`Invalid value for ${name}: "${value}" is not a positive integer`);
    process.exit(1);
  }
  return n;
}

/**
 * Validate a format string against allowed values.
 */
export function validateFormat(format: string): Format {
  if (!VALID_FORMATS.includes(format as Format)) {
    error(`Invalid format: "${format}". Allowed: ${VALID_FORMATS.join(", ")}`);
    process.exit(1);
  }
  return format as Format;
}
