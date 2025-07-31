import type { Message } from "telegraf/types";
import { db } from "./db";

async function canParse(ctx: Message) {
  const userId = ctx.from?.id;
  if (!userId) {
    return false;
  }
  const user = await db.query.UsersTable.findFirst({
    where: (table, { eq, and }) =>
      and(eq(table.telegramId, userId), eq(table.canParse, true)),
  });
  return !!user;
}

export async function canSave(userId?: number) {
  if (!userId) {
    return false;
  }
  const user = await db.query.UsersTable.findFirst({
    where: (table, { eq, and }) =>
      and(eq(table.telegramId, userId), eq(table.canSave, true)),
  });
  return !!user;
}

export const guard = {
  canParse,
  canSave,
};
