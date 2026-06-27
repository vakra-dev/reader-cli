/**
 * Error formatting tests (offline, no API key needed)
 *
 * Tests that formatError produces rich, helpful error messages
 * from SDK typed errors.
 */

import { describe, it, expect } from "vitest";

// Import directly from the built output to test the actual module
import { formatError } from "../src/utils/output.js";
import {
  ReaderApiError,
  InvalidRequestError,
  UnauthenticatedError,
  InsufficientCreditsError,
  UrlBlockedError,
  RateLimitedError,
  ScrapeTimeoutError,
} from "@vakra-dev/reader-js";

describe("formatError", () => {
  it("formats ReaderApiError with code and HTTP status", () => {
    const err = new ReaderApiError(
      { code: "internal_error", message: "Something went wrong" },
      500,
      "req_abc123"
    );
    const output = formatError(err);
    expect(output).toContain("Something went wrong");
    expect(output).toContain("internal_error");
    expect(output).toContain("HTTP 500");
    expect(output).toContain("req_abc123");
  });

  it("formats InsufficientCreditsError with balance details", () => {
    const err = new InsufficientCreditsError(
      {
        code: "insufficient_credits",
        message: "Not enough credits",
        details: { required: 5, available: 0, resetAt: "2026-07-01T00:00:00Z" },
      },
      402
    );
    const output = formatError(err);
    expect(output).toContain("insufficient_credits");
    expect(output).toContain("5 credits");
    expect(output).toContain("0 credits");
    expect(output).toContain("2026-07-01");
  });

  it("formats RateLimitedError with retry info", () => {
    const err = new RateLimitedError(
      {
        code: "rate_limited",
        message: "Too many requests",
        details: { retryAfterSeconds: 30 },
      },
      429
    );
    const output = formatError(err);
    expect(output).toContain("rate_limited");
    expect(output).toContain("30 seconds");
  });

  it("formats UrlBlockedError with URL and reason", () => {
    const err = new UrlBlockedError(
      {
        code: "url_blocked",
        message: "URL is blocked",
        details: { url: "https://blocked.example.com", reason: "robots.txt disallows" },
      },
      403
    );
    const output = formatError(err);
    expect(output).toContain("url_blocked");
    expect(output).toContain("https://blocked.example.com");
    expect(output).toContain("robots.txt disallows");
  });

  it("formats UnauthenticatedError with config hint", () => {
    const err = new UnauthenticatedError(
      { code: "unauthenticated", message: "Invalid API key" },
      401
    );
    const output = formatError(err);
    expect(output).toContain("unauthenticated");
    expect(output).toContain("reader config show");
  });

  it("formats ScrapeTimeoutError with timeout value", () => {
    const err = new ScrapeTimeoutError(
      {
        code: "scrape_timeout",
        message: "Request timed out",
        details: { timeoutMs: 30000 },
      },
      504
    );
    const output = formatError(err);
    expect(output).toContain("scrape_timeout");
    expect(output).toContain("30000ms");
  });

  it("includes docsUrl when present", () => {
    const err = new InvalidRequestError(
      {
        code: "invalid_request",
        message: "Bad request",
        docsUrl: "https://docs.reader.dev/errors/invalid-request",
      },
      400
    );
    const output = formatError(err);
    expect(output).toContain("https://docs.reader.dev/errors/invalid-request");
  });

  it("formats plain Error simply", () => {
    const output = formatError(new Error("Something broke"));
    expect(output).toBe("Something broke");
  });

  it("adds hint for ECONNREFUSED", () => {
    const output = formatError(new Error("connect ECONNREFUSED 127.0.0.1:6002"));
    expect(output).toContain("ECONNREFUSED");
    expect(output).toContain("reader config show");
  });

  it("adds hint for ENOTFOUND", () => {
    const output = formatError(new Error("getaddrinfo ENOTFOUND bad.example.com"));
    expect(output).toContain("ENOTFOUND");
    expect(output).toContain("DNS lookup failed");
  });

  it("handles non-Error values", () => {
    expect(formatError("string error")).toBe("string error");
    expect(formatError(42)).toBe("42");
    expect(formatError(null)).toBe("null");
  });
});
