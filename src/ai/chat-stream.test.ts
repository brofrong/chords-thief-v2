import { describe, expect, test } from "bun:test";
import type { ChatStreamChunk } from "@openrouter/sdk/models";
import { mapChatChunksToText, withOnFirstChunk } from "./chat-stream";

function chunk(
	partial: Partial<ChatStreamChunk> & {
		delta?: string | null;
		error?: ChatStreamChunk["error"];
	},
): ChatStreamChunk {
	const { delta, error, ...rest } = partial;
	return {
		id: "test",
		object: "chat.completion.chunk",
		created: 0,
		model: "test",
		choices:
			delta === undefined
				? []
				: [
						{
							index: 0,
							delta: { content: delta, role: "assistant" },
							finishReason: null,
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
});

describe("withOnFirstChunk", () => {
	test("awaits onFirst before yielding the first chunk", async () => {
		const order: string[] = [];

		async function* source() {
			order.push("chunk-ready");
			yield "Am";
			order.push("after-first");
			yield " G";
		}

		const parts = await collect(
			withOnFirstChunk(source(), async () => {
				order.push("on-first");
			}),
		);

		expect(parts).toEqual(["Am", " G"]);
		expect(order).toEqual(["chunk-ready", "on-first", "after-first"]);
	});

	test("does not call onFirst when the stream is empty", async () => {
		let called = false;

		async function* empty() {
			// no chunks
		}

		expect(await collect(withOnFirstChunk(empty(), async () => {
			called = true;
		}))).toEqual([]);
		expect(called).toBe(false);
	});

	test("calls onFirst only once", async () => {
		let calls = 0;

		async function* source() {
			yield "a";
			yield "b";
			yield "c";
		}

		await collect(
			withOnFirstChunk(source(), async () => {
				calls++;
			}),
		);

		expect(calls).toBe(1);
	});
});
