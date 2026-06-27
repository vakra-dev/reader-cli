import type { Command } from "commander";
import { ReaderClient } from "@vakra-dev/reader-js";
import { getApiKey, getApiUrl } from "../utils/config.js";
import { outputContent, outputJson, saveScreenshot, info, error, formatError, scrapeSpinner } from "../utils/output.js";
import { normalizeUrl, validateFormat, parsePositiveInt } from "../utils/validate.js";

export function registerScrapeCommand(program: Command): void {
  program
    .command("scrape <url>")
    .description("Scrape a URL and output content")
    .option("-f, --format <format>", "Output format: markdown (default), html, screenshot", "markdown")
    .option("--json", "Output full JSON response")
    .option("-o, --output <file>", "Write output to file")
    .option("--no-main-content", "Include full page (nav, header, footer)")
    .option("--include-tags <selectors>", "CSS selectors to include (comma-separated)")
    .option("--exclude-tags <selectors>", "CSS selectors to exclude (comma-separated)")
    .option("--wait-for <selector>", "Wait for CSS selector before scraping")
    .option("--timeout <ms>", "Timeout in milliseconds", "30000")
    .option("--proxy-mode <mode>", "Proxy mode: standard (default) or premium")
    .action(async (rawUrl: string, opts) => {
      const url = normalizeUrl(rawUrl);
      const apiKey = getApiKey();
      const client = new ReaderClient({ apiKey, baseUrl: getApiUrl() });

      const requestedFormat = validateFormat(opts.format);
      const formats: Array<"markdown" | "html" | "screenshot"> = [requestedFormat];

      // If screenshot requested alongside another format
      if (requestedFormat !== "screenshot" && opts.output?.endsWith(".png")) {
        formats.push("screenshot");
      }

      const timeout = parsePositiveInt(opts.timeout, "--timeout");
      const spinner = scrapeSpinner();

      try {
        const result = await client.read({
          url,
          formats,
          onlyMainContent: opts.mainContent !== false,
          includeTags: opts.includeTags?.split(",").map((s: string) => s.trim()),
          excludeTags: opts.excludeTags?.split(",").map((s: string) => s.trim()),
          waitForSelector: opts.waitFor,
          timeoutMs: timeout,
          proxyMode: opts.proxyMode,
        });

        if (result.kind === "scrape") {
          const data = result.data;
          spinner.success("Done -- content ready");

          if (opts.json) {
            outputJson(data);
            return;
          }

          // Screenshot: save to file
          if (data.screenshot) {
            const path = saveScreenshot(data.screenshot, opts.output);
            info(`Screenshot saved to ${path}`);
            if (requestedFormat === "screenshot") return;
          }

          // Content output
          const content = data.markdown || data.html || "";
          if (opts.output && !opts.output.endsWith(".png")) {
            const { writeFileSync } = await import("fs");
            writeFileSync(opts.output, content);
            info(`Written to ${opts.output}`);
          } else {
            outputContent(content);
          }
        } else {
          // Job-based (batch) - wait for completion
          const job = result.data;
          spinner.success(`Done -- ${job.results.length} pages`);

          if (opts.json) {
            outputJson(job);
          } else {
            for (const page of job.results) {
              outputContent(page.markdown || page.html || "");
            }
          }
        }
      } catch (err: unknown) {
        spinner.error("Failed");
        error(formatError(err));
        process.exit(1);
      }
    });
}
