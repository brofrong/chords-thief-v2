import path from "node:path";
import { $ } from "bun";
import { env } from "./utils/env";

export async function initGit() {
  //check if obsidian-vault folder exists
  const vaultPath = path.join(env.PATH_TO_SAVE);
  if (!Bun.file(vaultPath).exists()) {
    return { error: "no git founded" };
  }
  try {
    await $`cd ${env.PATH_TO_SAVE} && gh auth status`.text();
  } catch (err) {
    return { error: `failed git login: ${JSON.stringify(err)}` };
  }
  return await gitPull();
}

export async function gitPull() {
  try {
    await $`cd ${env.PATH_TO_SAVE} && git pull`.text();
    return { error: null };
  } catch (err) {
    return { error: `failed git pull: ${JSON.stringify(err)}` };
  }
}

export async function gitPush(songName: string) {
  try {
    await $`cd ${env.PATH_TO_SAVE} && git pull && git add . && git commit -m "add ${songName}" && git push`.text();
    return { error: null };
  } catch (err) {
    return { error: `failed git push: ${JSON.stringify(err)}` };
  }
}
