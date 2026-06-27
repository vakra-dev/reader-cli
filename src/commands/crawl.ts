import type { Command } from "commander";
import { ReaderClient } from "@vakra-dev/reader-js";
import { getApiKey, getApiUrl } from "../utils/config.js";
import { outputContent, outputJson, info, error, formatError, crawlSpinner } from "../utils/output.js";
import { normalizeUrl, parsePositiveInt } from "../utils/validate.js";

export function registerCrawlCommand(program: Command): void {
  program
    .command("crawl <url>")
    .description("Crawl a website and output discovered pages")
    .option("--max-depth <n>", "Maximum crawl depth", "2")
    .option("--max-pages <n>", "Maximum pages to crawl", "20")
    .option("--urls-only", "Only output discovered URLs, don't scrape content")
    .option("--json", "Output full JSON response")
    .option("-o, --output-dir <dir>", "Write each page to a separate file")
    .action(async (rawUrl: string, opts) => {
      const url = normalizeUrl(rawUrl);
      const apiKey = getApiKey();
      const client = new ReaderClient({ apiKey, baseUrl: getApiUrl() });

      const maxDepth = parsePositiveInt(opts.maxDepth, "--max-depth");
      const maxPages = parsePositiveInt(opts.maxPages, "--max-pages");

      let domain: string;
      try {
        domain = new URL(url).hostname;
      } catch {
        domain = url;
      }

      const spinner = crawlSpinner(domain);

      try {
        const result = await client.read({
          url,
          maxDepth,
          maxPages,
          formats: opts.urlsOnly ? [] : ["markdown"],
        });

        if (result.kind !== "job") {
          spinner.error("Unexpected response");
          error("Expected a crawl job but got a scrape result");
          process.exit(1);
        }

        const job = result.data;
        spinner.success(`Done -- ${job.results.length} pages crawled`);

        if (opts.json) {
          outputJson(job);
          return;
        }

        if (opts.urlsOnly || job.results.length === 0) {
          // Output one URL per line
          for (const page of job.results) {
            outputContent(page.url + "\n");
          }
          info(`\n${job.results.length} URLs discovered`);
          return;
        }

        // Output each page's content
        if (opts.outputDir) {
          const { mkdirSync, writeFileSync } = await import("fs");
          mkdirSync(opts.outputDir, { recursive: true });

          for (const page of job.results) {
            const slug = new URL(page.url).pathname
              .replace(/\//g, "_")
              .replace(/^_/, "")
              .replace(/_$/, "") || "index";
            const filename = `${opts.outputDir}/${slug}.md`;
            writeFileSync(filename, page.markdown || page.html || "");
          }
          info(`${job.results.length} pages written to ${opts.outputDir}/`);
        } else {
          for (let i = 0; i < job.results.length; i++) {
            const page = job.results[i];
            if (i > 0) outputContent("\n---\n\n");
            outputContent(`# ${page.url}\n\n`);
            outputContent(page.markdown || page.html || "");
          }
          info(`\n${job.results.length} pages crawled`);
        }
      } catch (err: unknown) {
        spinner.error("Failed");
        error(formatError(err));
        process.exit(1);
      }
    });
}
