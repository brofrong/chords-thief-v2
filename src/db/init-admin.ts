import { eq } from "drizzle-orm";
import { db } from ".";
import { env } from "../utils/env";
import { UsersTable } from "./schema";

export async function initAdmin() {
  const adminId = env.ADMIN_ID;
  if (!adminId) {
    console.log("ADMIN_ID is not set");
    return;
  }

  const admin = await db.query.user.findFirst({
    where: {
      telegramId: adminId,
    },
  });
  
  if (!admin) {
    await db.insert(UsersTable).values({
      telegramId: adminId,
      canSave: true,
      canParse: true,
    });
  }
  if(admin && !admin.canSave) {
    await db.update(UsersTable).set({
      canSave: true,
      canParse: true,
    }).where(eq(UsersTable.telegramId, adminId));
  }

  console.log("Admin initialized");
}
