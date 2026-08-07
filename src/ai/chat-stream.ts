import type { ChatStreamChunk } from "@openrouter/sdk/models";

/** Maps OpenRouter chat chunks to plain text for Telegram streaming. */
export async function* mapChatChunksToText(
	stream: AsyncIterable<ChatStreamChunk>,
	signal?: AbortSignal,
): AsyncGenerator<string> {
	for await (const chunk of stream) {
		if (signal?.aborted) {
			throw new DOMException("Stream aborted", "AbortError");
		}
		if (chunk.error) {
			throw new Error(chunk.error.message);
		}
		const delta = chunk.choices[0]?.delta?.content;
		if (delta) {
			yield delta;
		}
	}
}

/** Runs `onFirst` once, before yielding the first chunk (e.g. clear a loading status). */
export async function* withOnFirstChunk<T>(
	stream: AsyncIterable<T>,
	onFirst: () => void | Promise<void>,
): AsyncGenerator<T> {
	let first = true;
	for await (const chunk of stream) {
		if (first) {
			first = false;
			await onFirst();
		}
		yield chunk;
	}
}
