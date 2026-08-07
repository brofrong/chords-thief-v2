import { InlineKeyboard } from "grammy";
import type { OpenRouterModel } from "../ai/openrouter-models";

export const PAGE_SIZE = 10;
export const MODEL_CALLBACK_RE = /^(mdl:\d+|mdlpage:\d+|mdlmanual)$/;

export function truncateLabel(name: string, max = 45): string {
	if (name.length <= max) return name;
	return `${name.slice(0, max - 1)}…`;
}

export function buildModelKeyboard(
	models: OpenRouterModel[],
	page: number,
	pageSize = PAGE_SIZE,
): InlineKeyboard {
	const keyboard = new InlineKeyboard();
	const start = page * pageSize;
	const pageModels = models.slice(start, start + pageSize);

	for (let i = 0; i < pageModels.length; i++) {
		const model = pageModels[i]!;
		keyboard.text(truncateLabel(model.name), `mdl:${start + i}`).row();
	}

	const hasPrev = page > 0;
	const hasNext = start + pageSize < models.length;

	if (hasPrev && hasNext) {
		keyboard
			.text("◀️ Назад", `mdlpage:${page - 1}`)
			.text("Ещё ▶️", `mdlpage:${page + 1}`)
			.row();
	} else if (hasPrev) {
		keyboard.text("◀️ Назад", `mdlpage:${page - 1}`).row();
	} else if (hasNext) {
		keyboard.text("Ещё ▶️", `mdlpage:${page + 1}`).row();
	}

	keyboard.text("✏️ Ввести вручную", "mdlmanual");
	return keyboard;
}
