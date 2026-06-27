/**
 * Validation utility tests (offline, no API key needed)
 *
 * Tests URL normalization, integer parsing, and format validation
 * by running the CLI as a subprocess.
 */

import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { join } from "path";

const CLI = "node dist/index.js";
const CWD = join(import.meta.dirname, "..");

/**
 * Run CLI and capture stderr. Uses a dummy API key so validation
 * runs before the API call (which will fail, but we don't care).
 */
function runStderr(args: string): { exitCode: number; stderr: string; stdout: string } {
  try {
    const stdout = execSync(`${CLI} ${args}`, {
      cwd: CWD,
      env: { ...process.env, READER_API_KEY: "rdr_dummy_for_validation_test" },
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return { exitCode: 0, stderr: "", stdout };
  } catch (err: any) {
    return {
      exitCode: err.status ?? 1,
      stderr: (err.stderr || "").trim(),
      stdout: (err.stdout || "").trim(),
    };
  }
}

describe("URL normalization", () => {
  it("rejects completely invalid URLs", () => {
    // After https:// is prepended, "https://://garbage" is invalid
    const { stderr, exitCode } = runStderr("scrape ://garbage");
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Invalid URL");
  });

  it("rejects empty-like URLs", () => {
    // Commander requires the <url> argument, so passing just spaces fails at Commander level
    const { exitCode } = runStderr("scrape");
    expect(exitCode).not.toBe(0);
  });

  it("normalizes bare domain by prepending https://", () => {
    // This will hit the API and fail with auth, but stderr should show normalization
    const { stderr } = runStderr("scrape example.com");
    expect(stderr).toContain("Normalized URL");
    expect(stderr).toContain("https://example.com");
  });

  it("leaves https:// URLs unchanged", () => {
    // Should NOT show normalization message
    const { stderr } = runStderr("scrape https://example.com");
    expect(stderr).not.toContain("Normalized URL");
  });

  it("leaves http:// URLs unchanged", () => {
    const { stderr } = runStderr("scrape http://example.com");
    expect(stderr).not.toContain("Normalized URL");
  });
});

describe("format validation", () => {
  it("rejects invalid format", () => {
    const { stderr, exitCode } = runStderr("scrape https://example.com -f pdf");
    expect(exitCode).toBe(1);
    expect(stderr).toContain("Invalid format");
    expect(stderr).toContain("pdf");
    expect(stderr).toContain("markdown, html, screenshot");
  });

  it("accepts markdown format", () => {
    const { stderr } = runStderr("scrape https://example.com -f markdown");
    expect(stderr).not.toContain("Invalid format");
  });

  it("accepts html format", () => {
    const { stderr } = runStderr("scrape https://example.com -f html");
    expect(stderr).not.toContain("Invalid format");
  });

  it("accepts screenshot format", () => {
    const { stderr } = runStderr("scrape https://example.com -f screenshot");
    expect(stderr).not.toContain("Invalid format");
  });
});

describe("numeric option validation", () => {
  it("rejects non-numeric --timeout", () => {
    const { stderr, exitCode } = runStderr("scrape https://example.com --timeout abc");
    expect(exitCode).toBe(1);
    expect(stderr).toContain("not a positive integer");
    expect(stderr).toContain("--timeout");
  });

  it("rejects zero --timeout", () => {
    const { stderr, exitCode } = runStderr("scrape https://example.com --timeout 0");
    expect(exitCode).toBe(1);
    expect(stderr).toContain("not a positive integer");
  });

  it("rejects non-numeric --max-depth", () => {
    const { stderr, exitCode } = runStderr("crawl https://example.com --max-depth abc");
    expect(exitCode).toBe(1);
    expect(stderr).toContain("not a positive integer");
    expect(stderr).toContain("--max-depth");
  });

  it("rejects negative --max-pages", () => {
    const { stderr, exitCode } = runStderr("crawl https://example.com --max-pages -1");
    expect(exitCode).toBe(1);
    expect(stderr).toContain("not a positive integer");
  });
});
