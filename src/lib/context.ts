import { readFileSync, existsSync } from "fs";
import { resolve, extname } from "path";

export const MAX_WORDS_PER_PAGE = 1500;   // per fetched page
export const MAX_WORDS_PER_FILE = 2000;   // per .txt / .md file
export const MAX_WORDS_TOTAL   = 5000;   // across all sources combined

// ── Word utilities ────────────────────────────────────────────────────────────

function truncateToWords(text: string, maxWords: number): { text: string; truncated: boolean; words: number } {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text, truncated: false, words: words.length };
  return { text: words.slice(0, maxWords).join(" "), truncated: true, words: maxWords };
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ── HTML stripping ────────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<(script|style|nav|footer|header|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── URL fetching ──────────────────────────────────────────────────────────────

async function fetchUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Ramoira-CLI/1.0 (brand schema enrichment)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  return contentType.includes("text/html") ? stripHtml(raw) : raw;
}

// Fetches homepage + /about + /pricing, each capped at MAX_WORDS_PER_PAGE
async function fetchSite(rawUrl: string): Promise<{ text: string; pagesFetched: string[]; wordsPerPage: number[] }> {
  const base = rawUrl.replace(/\/$/, "");
  const paths = ["", "/about", "/pricing"];
  const labels = ["homepage", "about", "pricing"];

  const results = await Promise.allSettled(paths.map((p) => fetchUrl(base + p)));

  const parts: string[] = [];
  const pagesFetched: string[] = [];
  const wordsPerPage: number[] = [];

  results.forEach((r, i) => {
    if (r.status !== "fulfilled" || !r.value.trim()) return;
    const { text, words } = truncateToWords(r.value, MAX_WORDS_PER_PAGE);
    parts.push(`=== ${labels[i]}: ${base + paths[i]} ===\n${text}`);
    pagesFetched.push(base + paths[i]);
    wordsPerPage.push(words);
  });

  if (!parts.length) throw new Error(`Could not fetch any content from ${rawUrl}`);

  return { text: parts.join("\n\n"), pagesFetched, wordsPerPage };
}

// ── File reading ──────────────────────────────────────────────────────────────

function readContextFile(filePath: string): string {
  const abs = resolve(filePath);
  if (!existsSync(abs)) throw new Error(`File not found: ${abs}`);

  const ext = extname(filePath).toLowerCase();
  if (![".txt", ".md", ".markdown"].includes(ext)) {
    throw new Error(`Unsupported file type: ${ext}. Use .txt or .md`);
  }

  return readFileSync(abs, "utf8");
}

// ── Public entry ──────────────────────────────────────────────────────────────

export interface ContextSource {
  type: "url" | "file";
  value: string;
}

export interface PageResult {
  url: string;
  words: number;
}

export interface SourceResult {
  label: string;
  words: number;       // words from this source before total cap
  truncated: boolean;  // truncated at per-source limit
  pages?: PageResult[];
}

export interface GatheredContext {
  text: string;
  totalWords: number;
  truncated: boolean;  // truncated at total cap
  sources: SourceResult[];
}

export async function gatherContext(sources: ContextSource[]): Promise<GatheredContext> {
  const parts: string[] = [];
  const sourceResults: SourceResult[] = [];

  for (const source of sources) {
    if (source.type === "url") {
      const { text, pagesFetched, wordsPerPage } = await fetchSite(source.value);
      const totalSiteWords = wordsPerPage.reduce((a, b) => a + b, 0);
      parts.push(`--- Website: ${source.value} ---\n${text}`);
      sourceResults.push({
        label: source.value,
        words: totalSiteWords,
        truncated: wordsPerPage.some((w) => w === MAX_WORDS_PER_PAGE),
        pages: pagesFetched.map((url, i) => ({ url, words: wordsPerPage[i] })),
      });
    } else {
      const raw = readContextFile(source.value);
      const { text: capped, truncated, words } = truncateToWords(raw, MAX_WORDS_PER_FILE);
      parts.push(`--- File: ${source.value} ---\n${capped}`);
      sourceResults.push({ label: source.value, words, truncated });
    }
  }

  const combined = parts.join("\n\n");
  const rawTotal = wordCount(combined);
  const final = truncateToWords(combined, MAX_WORDS_TOTAL);

  return {
    text: final.text,
    totalWords: rawTotal,
    truncated: final.truncated,
    sources: sourceResults,
  };
}
