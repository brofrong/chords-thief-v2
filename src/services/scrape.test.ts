import { describe, expect, test } from "bun:test";
import {
	DEFAULT_MAX_HTML_KB,
	extractChordContent,
	truncateToKb,
} from "./scrape";

describe("truncateToKb", () => {
	test("returns text unchanged when under limit", () => {
		expect(truncateToKb("hello", 1)).toBe("hello");
	});

	test("cuts to max kilobytes", () => {
		const input = "a".repeat(3000);
		const out = truncateToKb(input, 1);
		expect(out.length).toBeLessThanOrEqual(1024);
		expect(out.endsWith("\n…[truncated]")).toBe(true);
	});
});

describe("extractChordContent", () => {
	test("prefers chord containers over full body", () => {
		const html = `
      <html><body>
        <nav>menu noise</nav>
        <script>evil()</script>
        <div class="b-chords">
          <span class="chord">Am</span> Hello world
        </div>
        <footer>ads</footer>
      </body></html>
    `;
		const text = extractChordContent(html, DEFAULT_MAX_HTML_KB);
		expect(text).toContain("Am");
		expect(text).toContain("Hello world");
		expect(text).not.toContain("evil");
		expect(text).not.toContain("menu noise");
	});

	test("falls back to cleaned body text when no chord blocks", () => {
		const html = `
      <html><body>
        <script>x</script>
        <p>Just lyrics here</p>
      </body></html>
    `;
		const text = extractChordContent(html, DEFAULT_MAX_HTML_KB);
		expect(text).toContain("Just lyrics here");
		expect(text).not.toContain("x");
	});

	test("truncates oversized extraction", () => {
		const fat = "Am C Dm G ".repeat(5000);
		const html = `<html><body><div class="chord-sheet">${fat}</div></body></html>`;
		const text = extractChordContent(html, 1);
		expect(Buffer.byteLength(text, "utf8")).toBeLessThanOrEqual(1024 + 64);
	});
});
