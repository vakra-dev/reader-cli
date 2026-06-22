# Reader CLI

Read the web from your terminal. Built for AI coding agents.

The Reader CLI scrapes, crawls, and screenshots web pages via the [Reader API](https://reader.dev). It outputs clean markdown to stdout, ready to pipe into any AI workflow.

## Install

```bash
npm install -g @vakra-dev/reader-cli
```

Or run directly:

```bash
npx @vakra-dev/reader-cli scrape https://example.com
```

## Setup

**For humans** - save your API key once:

```bash
reader config set api-key rdr_your_key_here
```

**For AI agents / CI** - set the environment variable:

```bash
export READER_API_KEY=rdr_your_key_here
```

Get your API key at [console.reader.dev](https://console.reader.dev).

## Usage

### Scrape a page

```bash
reader scrape https://example.com
```

Output is clean markdown, printed to stdout:

```bash
reader scrape https://docs.stripe.com/payments > stripe-payments.md
```

### Formats

```bash
reader scrape https://example.com                     # markdown (default)
reader scrape https://example.com -f html              # cleaned HTML
reader scrape https://example.com -f screenshot -o page.png   # full-page screenshot
```

### JSON output

Get the full API response with metadata:

```bash
reader scrape https://example.com --json
```

### Crawl a site

Discover and scrape all pages:

```bash
reader crawl https://docs.example.com --max-pages 20
```

Save pages to individual files:

```bash
reader crawl https://docs.example.com -o ./docs/
```

List URLs only:

```bash
reader crawl https://example.com --urls-only
```

### Check status

```bash
reader status
```

```
Reader CLI v0.1.0
API:     https://api.reader.dev (connected)
Key:     rdr_...c3bb
Credits: 874 / 1000 (free tier)
Resets:  2026-07-01
```

### Check credits

```bash
reader credits
reader credits --json
```

### Configuration

```bash
reader config set api-key <key>     # save API key
reader config set api-url <url>     # custom API URL
reader config show                  # show current config
```

Config is stored at `~/.reader/config.json`. Environment variables take precedence:

| Setting | Env var | Default |
|---------|---------|---------|
| API key | `READER_API_KEY` | - |
| API URL | `READER_API_URL` | `https://api.reader.dev` |

## Command reference

### `reader scrape <url>`

| Flag | Description | Default |
|------|-------------|---------|
| `-f, --format` | Output format: `markdown`, `html`, `screenshot` | `markdown` |
| `--json` | Full JSON response | - |
| `-o, --output` | Write to file | stdout |
| `--no-main-content` | Include nav, header, footer | - |
| `--include-tags` | CSS selectors to keep | - |
| `--exclude-tags` | CSS selectors to remove | - |
| `--wait-for` | Wait for CSS selector | - |
| `--timeout` | Timeout in ms | `30000` |
| `--proxy-mode` | `standard`, `stealth`, `auto` | `auto` |

### `reader crawl <url>`

| Flag | Description | Default |
|------|-------------|---------|
| `--max-depth` | Crawl depth | `2` |
| `--max-pages` | Max pages to crawl | `20` |
| `--urls-only` | Only list URLs | - |
| `--json` | Full JSON response | - |
| `-o, --output-dir` | Write pages to directory | stdout |

### `reader status`

Shows CLI version, API connectivity, credit balance, and tier.

### `reader credits`

| Flag | Description |
|------|-------------|
| `--json` | Full JSON response |

### `reader config`

| Subcommand | Description |
|------------|-------------|
| `set api-key <key>` | Save API key |
| `set api-url <url>` | Set custom API URL |
| `show` | Display current config |

## For AI agents

The CLI is designed for seamless use with AI coding agents like Claude Code, Cursor, and Codex:

- **Markdown to stdout** - agents read content directly
- **Errors to stderr** - never pollutes piped output
- **Exit codes** - 0 on success, 1 on error
- **No interactive prompts** - everything via flags and env vars
- **`--json` flag** - structured output for programmatic use

## License

MIT - see [LICENSE](LICENSE).
