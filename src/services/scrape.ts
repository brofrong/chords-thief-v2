import * as cheerio from "cheerio";
import { err, ok, type Result } from "../types/result";

export const DEFAULT_FETCH_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export const DEFAULT_MAX_HTML_KB = 100;

const CHORD_SELECTORS = [
	"[class*='chord' i]",
	"[id*='chord' i]",
	"[class*='accorde' i]",
	"[class*='podbor' i]",
	"[class*='song-text' i]",
	"[class*='songtext' i]",
	"[class*='lyrics' i]",
	"pre",
	"code",
];

const NOISE_SELECTORS =
	"script, style, noscript, iframe, svg, nav, footer, header, aside, form";

export function truncateToKb(text: string, maxKb: number): string {
	const maxBytes = Math.max(1, maxKb) * 1024;
	const bytes = Buffer.from(text, "utf8");
	if (bytes.byteLength <= maxBytes) {
		return text;
	}
	const marker = "\n…[truncated]";
	const markerBytes = Buffer.byteLength(marker, "utf8");
	const slice = bytes.subarray(0, Math.max(0, maxBytes - markerBytes));
	return `${slice.toString("utf8")}${marker}`;
}

export function extractChordContent(
	html: string,
	maxKb = DEFAULT_MAX_HTML_KB,
): string {
	const $ = cheerio.load(html);
	$(NOISE_SELECTORS).remove();

	const chunks: string[] = [];
	for (const selector of CHORD_SELECTORS) {
		try {
			$(selector).each((_, el) => {
				const text = $(el).text().replace(/\u00a0/g, " ").trim();
				if (text.length > 0) {
					chunks.push(text);
				}
			});
		} catch {
			// cheerio may reject exotic selectors on older builds — skip
		}
	}

	let content =
		chunks.length > 0
			? uniqueJoin(chunks)
			: $("body").text().replace(/\u00a0/g, " ").replace(/\s+\n/g, "\n").trim();

	content = content.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
	return truncateToKb(content, maxKb);
}

function uniqueJoin(chunks: string[]): string {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const chunk of chunks) {
		if (seen.has(chunk)) continue;
		seen.add(chunk);
		out.push(chunk);
	}
	return out.join("\n\n");
}

export type FetchHtmlOptions = {
	timeoutMs?: number;
	maxBytes?: number;
	maxHtmlKb?: number;
	fetchImpl?: (
		input: string,
		init?: { signal?: AbortSignal },
	) => Promise<Response>;
};

export async function fetchHtml(
	url: string,
	options: FetchHtmlOptions = {},
): Promise<Result<string>> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_RESPONSE_BYTES;
	const maxHtmlKb = options.maxHtmlKb ?? DEFAULT_MAX_HTML_KB;
	const fetchImpl = options.fetchImpl ?? fetch;

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetchImpl(url, { signal: controller.signal });
		if (!response.ok) {
			return err(
				`Не удалось загрузить страницу: HTTP ${response.status} ${response.statusText}`,
			);
		}

		const contentLength = response.headers.get("content-length");
		if (contentLength && Number(contentLength) > maxBytes) {
			return err(
				`Страница слишком большая (${contentLength} байт). Лимит: ${maxBytes} байт.`,
			);
		}

		const buffer = Buffer.from(await response.arrayBuffer());
		if (buffer.byteLength > maxBytes) {
			return err(
				`Страница слишком большая (${buffer.byteLength} байт). Лимит: ${maxBytes} байт.`,
			);
		}

		const extracted = extractChordContent(buffer.toString("utf8"), maxHtmlKb);
		if (!extracted.trim()) {
			return err("На странице не нашлось текста с аккордами");
		}
		return ok(extracted);
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			return err(
				`Таймаут загрузки страницы (${timeoutMs / 1000}с). Попробуй другую ссылку.`,
			);
		}
		const message =
			error instanceof Error ? error.message : "Неизвестная ошибка сети";
		return err(`Ошибка загрузки страницы: ${message}`);
	} finally {
		clearTimeout(timer);
	}
}
