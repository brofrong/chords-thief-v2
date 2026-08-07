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
