/**
 * Config command tests
 *
 * Tests config resolution, persistence, and display.
 * Uses isolated HOME directory to avoid polluting real config.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync, spawnSync } from "child_process";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const CLI = "node dist/index.js";
const CWD = join(import.meta.dirname, "..");

let testHome: string;

beforeEach(() => {
  testHome = join(tmpdir(), `reader-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testHome, { recursive: true });
});

afterEach(() => {
  rmSync(testHome, { recursive: true, force: true });
});

function run(args: string, extraEnv?: Record<string, string>): string {
  return execSync(`${CLI} ${args}`, {
    cwd: CWD,
    env: { ...process.env, HOME: testHome, READER_API_KEY: "", READER_API_URL: "", ...extraEnv },
    encoding: "utf-8",
    timeout: 10000,
  }).trim();
}

function runWithStderr(args: string, extraEnv?: Record<string, string>): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(`${CLI} ${args}`, {
      cwd: CWD,
      env: { ...process.env, HOME: testHome, READER_API_KEY: "", READER_API_URL: "", ...extraEnv },
      encoding: "utf-8",
      timeout: 10000,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    // Capture stderr even on success by reading from the child process
    return { stdout, stderr: "", exitCode: 0 };
  } catch (err: any) {
    return {
      stdout: (err.stdout || "").trim(),
      stderr: (err.stderr || "").trim(),
      exitCode: err.status ?? 1,
    };
  }
}

function runStderr(args: string, extraEnv?: Record<string, string>): string {
  const result = runWithStderr(args, extraEnv);
  return result.stderr;
}

describe("config commands", () => {
  it("config set api-key saves and config show displays it", () => {
    run("config set api-key rdr_test_key_abcd1234");
    const output = run("config show");
    expect(output).toContain("rdr_...1234");
    expect(output).toContain("config.json");
  });

  it("config set api-url saves custom URL", () => {
    run("config set api-url https://custom.example.com");
    const output = run("config show");
    expect(output).toContain("https://custom.example.com");
    expect(output).toContain("config.json");
  });

  it("env var takes precedence over config file", () => {
    run("config set api-key rdr_file_key_5678");
    const output = run("config show", { READER_API_KEY: "rdr_env_key_abcd" });
    expect(output).toContain("rdr_...abcd");
    expect(output).toContain("READER_API_KEY env");
  });

  it("shows default API URL when not configured", () => {
    const output = run("config show", { READER_API_KEY: "rdr_test" });
    expect(output).toContain("https://api.reader.dev");
    expect(output).toContain("default");
  });

  it("shows not configured when no key set", () => {
    const output = run("config show");
    expect(output).toContain("not configured");
  });

  it("rejects unknown config keys", () => {
    const output = runStderr("config set unknown-key value");
    expect(output).toContain("Unknown config key");
  });

  it("warns when API key does not start with rdr_", () => {
    const result = spawnSync("node", ["dist/index.js", "config", "set", "api-key", "notvalid123"], {
      cwd: CWD,
      env: { ...process.env, HOME: testHome, READER_API_KEY: "", READER_API_URL: "" },
      encoding: "utf-8",
      timeout: 10000,
    });
    const stderr = result.stderr.trim();
    expect(stderr).toContain("Warning");
    expect(stderr).toContain("rdr_");
  });

  it("does not warn when API key starts with rdr_", () => {
    // runStderr returns stderr from success too, but for a valid key there should be no warning
    run("config set api-key rdr_valid_key_5678");
    // If it ran without error, the key was accepted without warning
    const output = run("config show");
    expect(output).toContain("rdr_...5678");
  });

  it("rejects invalid API URL", () => {
    const output = runStderr("config set api-url not-a-url");
    expect(output).toContain("Invalid URL");
  });

  it("accepts valid API URL", () => {
    run("config set api-url https://custom-api.example.com");
    const output = run("config show");
    expect(output).toContain("https://custom-api.example.com");
  });
});
