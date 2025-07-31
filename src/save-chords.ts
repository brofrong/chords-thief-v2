import fs from "node:fs/promises";
import path from "node:path";
import { gitPush } from "./git";
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

export async function saveMessage(message: string, originalLink: string) {
  const name = getSongName(message);
  const filePath = await saveChords({ name, mainBody: message, originalLink });
  const gitResult = await gitPush(filePath);
  if (gitResult.error) {
    return gitResult;
  }
  return { success: { name }, error: null };
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

function getSongName(message: string): string {
  const regex = /#([^#\n]+)/;
  const match = message.match(regex);
  return match?.at(1) ?? "Неизвестное название";
}
