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
		const choice = chunk.choices[0];
		const delta = choice?.delta?.content;
		if (delta) {
			yield delta;
		}
		if (choice?.finishReason === "length") {
			throw new Error(
				"Ответ модели обрезан по лимиту токенов. Попробуй ещё раз или другую модель.",
			);
		}
	}
}

/**
 * Shows Telegram's native Thinking… draft immediately (empty sendMessageDraft),
 * clears the loading status without blocking the model stream, then forwards chunks.
 */
export async function* bridgeStatusToStream(
	stream: AsyncIterable<string>,
	clearStatus: () => void | Promise<void>,
): AsyncGenerator<string> {
	yield "";
	void Promise.resolve(clearStatus()).catch(() => {});
	yield* stream;
}
