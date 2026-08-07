import fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "./types/result";
import { env } from "./utils/env";

export interface Chords {
	name: string;
	mainBody: string;
	originalLink: string;
}

async function pathToSave(fileName: string) {
	const basicName = path.join(env.PATH_TO_SAVE, fileName);
	let name = `${basicName}.md`;
	let nameTry = 1;

	while (await fs.exists(name)) {
		name = `${basicName} (${nameTry}).md`;
		nameTry++;
	}

	return name;
}

export async function saveMessage(
	message: string,
	originalLink: string,
): Promise<Result<{ name: string }>> {
	try {
		const name = getSongName(message);
		await saveChords({ name, mainBody: message, originalLink });
		return ok({ name });
	} catch (error) {
		const messageText =
			error instanceof Error ? error.message : "unknown save error";
		return err(messageText);
	}
}

export async function saveChords(chords: Chords) {
	const filePath = await pathToSave(chords.name);
	const dataToSave = formatChords(chords);
	await Bun.file(filePath).write(dataToSave);
	return filePath;
}

function formatChords(chords: Chords): string {
	return `${chords.mainBody}

  src: [${chords.name}](${chords.originalLink})
  `;
}

export function getSongName(message: string): string {
	const regex = /#([^#\n]+)/;
	const match = message.match(regex);
	return match?.at(1)?.trim() ?? "Неизвестное название";
}
