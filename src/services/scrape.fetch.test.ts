import { describe, expect, test } from "bun:test";
import { fetchHtml } from "./scrape";

describe("fetchHtml", () => {
	test("returns timeout error when aborted", async () => {
		const fetchImpl = () =>
			new Promise<Response>((_, reject) => {
				const error = new Error("aborted");
				error.name = "AbortError";
				reject(error);
			});

		const result = await fetchHtml("https://example.com", {
			fetchImpl,
			timeoutMs: 10,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("Таймаут");
		}
	});

	test("returns too-large error from content-length", async () => {
		const fetchImpl = async () =>
			new Response("ignored", {
				status: 200,
				headers: { "content-length": String(10_000_000) },
			});

		const result = await fetchHtml("https://example.com", {
			fetchImpl,
			maxBytes: 1000,
		});
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error).toContain("слишком большая");
		}
	});

	test("extracts chord content on success", async () => {
		const html = `<html><body><div class="chord-sheet">Am C lyrics</div></body></html>`;
		const fetchImpl = async () => new Response(html, { status: 200 });

		const result = await fetchHtml("https://example.com", { fetchImpl });
		expect(result.ok).toBe(true);
		if (result.ok) {
			expect(result.value).toContain("Am C lyrics");
		}
	});
});
