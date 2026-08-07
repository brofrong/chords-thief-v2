import { describe, expect, test } from "bun:test";
import type { ChatStreamChunk } from "@openrouter/sdk/models";
import { bridgeStatusToStream, mapChatChunksToText } from "./chat-stream";

function chunk(
	partial: Partial<ChatStreamChunk> & {
		delta?: string | null;
		finishReason?: ChatStreamChunk["choices"][number]["finishReason"];
		error?: ChatStreamChunk["error"];
	},
): ChatStreamChunk {
	const { delta, error, finishReason = null, ...rest } = partial;
	return {
		id: "test",
		object: "chat.completion.chunk",
		created: 0,
		model: "test",
		choices:
			delta === undefined && finishReason == null
				? []
				: [
						{
							index: 0,
							delta: { content: delta ?? null, role: "assistant" },
							finishReason,
						},
					],
		error,
		...rest,
	};
}

async function collect(stream: AsyncIterable<string>) {
	const parts: string[] = [];
	for await (const part of stream) {
		parts.push(part);
	}
	return parts;
}

describe("mapChatChunksToText", () => {
	test("yields content deltas", async () => {
		async function* source() {
			yield chunk({ delta: "Am" });
			yield chunk({ delta: " G" });
		}

		expect(await collect(mapChatChunksToText(source()))).toEqual([
			"Am",
			" G",
		]);
	});

	test("skips empty and missing deltas", async () => {
		async function* source() {
			yield chunk({ delta: "" });
			yield chunk({});
			yield chunk({ delta: null });
			yield chunk({ delta: "ok" });
		}

		expect(await collect(mapChatChunksToText(source()))).toEqual(["ok"]);
	});

	test("throws on chunk.error", async () => {
		async function* source() {
			yield chunk({ delta: "partial" });
			yield chunk({
				error: { code: 502, message: "Provider overloaded" },
			});
		}

		await expect(collect(mapChatChunksToText(source()))).rejects.toThrow(
			"Provider overloaded",
		);
	});

	test("stops when abort signal fires", async () => {
		const controller = new AbortController();

		async function* source() {
			yield chunk({ delta: "one" });
			controller.abort();
			yield chunk({ delta: "two" });
		}

		await expect(
			collect(mapChatChunksToText(source(), controller.signal)),
		).rejects.toThrow(/abort/i);
	});

	test("throws when finish_reason is length (truncated output)", async () => {
		async function* source() {
			yield chunk({ delta: "partial chords" });
			yield chunk({ delta: null, finishReason: "length" });
		}

		await expect(collect(mapChatChunksToText(source()))).rejects.toThrow(
			/обрезан|token|length/i,
		);
	});
});

describe("bridgeStatusToStream", () => {
	test("yields Thinking placeholder before reading the source", async () => {
		let sourceStarted = false;

		async function* source() {
			sourceStarted = true;
			yield "Am";
		}

		const gen = bridgeStatusToStream(source(), async () => {});
		const first = await gen.next();

		expect(first).toEqual({ done: false, value: "" });
		expect(sourceStarted).toBe(false);

		const second = await gen.next();
		expect(sourceStarted).toBe(true);
		expect(second).toEqual({ done: false, value: "Am" });
	});

	test("does not await clearStatus before forwarding source chunks", async () => {
		let resolveClear!: () => void;
		const clearGate = new Promise<void>((r) => {
			resolveClear = r;
		});
		let clearFinished = false;

		async function* source() {
			yield "Am";
			yield " G";
		}

		const gen = bridgeStatusToStream(source(), async () => {
			await clearGate;
			clearFinished = true;
		});

		expect((await gen.next()).value).toBe("");
		expect((await gen.next()).value).toBe("Am");
		expect(clearFinished).toBe(false);
		expect((await gen.next()).value).toBe(" G");
		expect((await gen.next()).done).toBe(true);
		expect(clearFinished).toBe(false);

		resolveClear();
		await Promise.resolve();
		await Promise.resolve();
		expect(clearFinished).toBe(true);
	});

	test("still clears status when the source is empty", async () => {
		let cleared = false;

		async function* empty() {}

		expect(
			await collect(
				bridgeStatusToStream(empty(), async () => {
					cleared = true;
				}),
			),
		).toEqual([""]);
		await Promise.resolve();
		await Promise.resolve();
		expect(cleared).toBe(true);
	});
});
