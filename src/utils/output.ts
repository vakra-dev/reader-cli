/**
 * Output formatting for the Reader CLI.
 *
 * Default: plain content to stdout (markdown/html)
 * --json: full JSON response to stdout
 * Progress/errors: always stderr
 */

import { writeFileSync } from "fs";
import yoctoSpinner from "yocto-spinner";
import {
  ReaderApiError,
  InsufficientCreditsError,
  RateLimitedError,
  UrlBlockedError,
  UnauthenticatedError,
  ScrapeTimeoutError,
} from "@vakra-dev/reader-js";

export function info(msg: string): void {
  console.error(msg);
}

export function error(msg: string): void {
  console.error(`Error: ${msg}`);
}

export function outputContent(content: string): void {
  process.stdout.write(content);
}

export function outputJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function saveScreenshot(base64: string, outputPath?: string): string {
  const buffer = Buffer.from(base64, "base64");
  const path = outputPath || "screenshot.png";
  writeFileSync(path, buffer);
  return path;
}

// ── Spinner ──────────────────────────────────────────────────────────

const SCRAPE_MESSAGES = [
  "Reading the page...",
  "Fetching content...",
  "Scraping the web...",
  "Extracting data...",
];

const CRAWL_MESSAGES = [
  "Discovering pages...",
  "Following links...",
  "Mapping the site...",
  "Crawling deeper...",
];

/**
 * Create a spinner that rotates through messages every few seconds,
 * so long-running operations feel alive.
 */
function rotatingSpinner(messages: string[], intervalMs = 3000) {
  let idx = Math.floor(Math.random() * messages.length);
  const spinner = yoctoSpinner({ text: messages[idx] }).start();

  const timer = setInterval(() => {
    idx = (idx + 1) % messages.length;
    spinner.text = messages[idx];
  }, intervalMs);

  // Patch stop/success/error to clear the rotation timer
  const origSuccess = spinner.success.bind(spinner);
  const origError = spinner.error.bind(spinner);
  const origStop = spinner.stop.bind(spinner);

  spinner.success = (text?: string) => { clearInterval(timer); return origSuccess(text); };
  spinner.error = (text?: string) => { clearInterval(timer); return origError(text); };
  spinner.stop = (text?: string) => { clearInterval(timer); return origStop(text); };

  return spinner;
}

export function scrapeSpinner() {
  return rotatingSpinner(SCRAPE_MESSAGES);
}

export function crawlSpinner(domain: string) {
  return rotatingSpinner([
    `Crawling ${domain}...`,
    ...CRAWL_MESSAGES,
  ]);
}

export function statusSpinner() {
  return yoctoSpinner({ text: "Pinging the API..." }).start();
}

export function creditsSpinner() {
  return yoctoSpinner({ text: "Fetching balance..." }).start();
}

// ── Error formatting ─────────────────────────────────────────────────

/**
 * Format an error for CLI display. Uses SDK typed errors for rich context.
 */
export function formatError(err: unknown): string {
  if (err instanceof ReaderApiError) {
    const lines: string[] = [];
    lines.push(`${err.message} (${err.code}, HTTP ${err.httpStatus})`);

    if (err instanceof InsufficientCreditsError) {
      if (err.required !== undefined) lines.push(`  Required:  ${err.required} credits`);
      if (err.available !== undefined) lines.push(`  Available: ${err.available} credits`);
      if (err.resetAt) lines.push(`  Resets:    ${err.resetAt}`);
    } else if (err instanceof RateLimitedError) {
      if (err.retryAfterSeconds) lines.push(`  Retry after: ${err.retryAfterSeconds} seconds`);
    } else if (err instanceof UrlBlockedError) {
      if (err.url) lines.push(`  URL:    ${err.url}`);
      if (err.reason) lines.push(`  Reason: ${err.reason}`);
    } else if (err instanceof UnauthenticatedError) {
      lines.push("  Check your API key: reader config show");
    } else if (err instanceof ScrapeTimeoutError) {
      if (err.timeoutMs) lines.push(`  Timeout: ${err.timeoutMs}ms`);
    }

    if (err.docsUrl) lines.push(`  Docs:    ${err.docsUrl}`);
    if (err.requestId) lines.push(`  Request: ${err.requestId}`);

    return lines.join("\n");
  }

  if (err instanceof Error) {
    const msg = err.message;
    // Network error hints
    if (msg.includes("ECONNREFUSED")) {
      return `${msg}\n  Could not connect to the API. Check your API URL: reader config show`;
    }
    if (msg.includes("ENOTFOUND")) {
      return `${msg}\n  DNS lookup failed. Check your API URL: reader config show`;
    }
    if (msg.includes("fetch failed") || msg.includes("network")) {
      return `${msg}\n  Network error. Check your internet connection.`;
    }
    return msg;
  }

  return String(err);
}
