export type OpenRouterModel = {
	id: string;
	name: string;
};

type OpenRouterModelsResponse = {
	data?: Array<{
		id?: string;
		name?: string;
		architecture?: {
			input_modalities?: string[];
		};
	}>;
};

function acceptsTextInput(inputModalities: string[] | undefined): boolean {
	if (!inputModalities || inputModalities.length === 0) {
		return true;
	}
	return inputModalities.includes("text");
}

/** Top models by OpenRouter weekly popularity (`sort=most-popular`). */
export async function fetchPopularModels(
	apiKey?: string | null,
): Promise<OpenRouterModel[]> {
	const headers: Record<string, string> = {
		Accept: "application/json",
	};
	if (apiKey) {
		headers.Authorization = `Bearer ${apiKey}`;
	}

	const response = await fetch(
		"https://openrouter.ai/api/v1/models?sort=most-popular",
		{ headers },
	);

	if (!response.ok) {
		throw new Error(
			`OpenRouter models request failed: ${response.status} ${response.statusText}`,
		);
	}

	const body = (await response.json()) as OpenRouterModelsResponse;
	const models: OpenRouterModel[] = [];

	for (const item of body.data ?? []) {
		if (!item.id) continue;
		if (!acceptsTextInput(item.architecture?.input_modalities)) continue;
		models.push({
			id: item.id,
			name: item.name?.trim() || item.id,
		});
	}

	return models;
}
