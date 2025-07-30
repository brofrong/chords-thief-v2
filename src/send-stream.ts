import type { Context } from "telegraf";
import type { Message } from "telegraf/types";

const MAX_MESSAGE_LENGTH = 4096;

export async function sendStream(ctx: Context, stream: AsyncIterable<string>, options?: { chunkSize?: number, reply?: Message.TextMessage }) {
  let fullMessage = '';
  let chunkBeforeEdit = options?.chunkSize || 100;


  let reply = options?.reply || await ctx.reply('Думаю над ответом...');
  if (options?.reply) {
    await ctx.telegram.editMessageText(reply.chat.id, reply.message_id, undefined, 'Думаю над ответом...');
  }

  let currentReplyCount = 0;

  for await (const textPart of stream) {
    fullMessage += textPart;
    if (fullMessage.length > chunkBeforeEdit) {
      const messageToUpdate = fullMessage.slice(currentReplyCount * MAX_MESSAGE_LENGTH, (currentReplyCount + 1) * MAX_MESSAGE_LENGTH) + '\n\n-------------\n\n Генерирую текст...';
      chunkBeforeEdit += options?.chunkSize || 100;

      // to be sure that we will not edit message more than once
      if (fullMessage.length > chunkBeforeEdit) {
        chunkBeforeEdit = fullMessage.length + (options?.chunkSize || 100);
      }

      if (messageToUpdate.length > MAX_MESSAGE_LENGTH) {
        await ctx.telegram.editMessageText(reply.chat.id, reply.message_id, undefined, fullMessage.slice(currentReplyCount * MAX_MESSAGE_LENGTH, (currentReplyCount + 1) * MAX_MESSAGE_LENGTH));
        currentReplyCount++;
        reply = await ctx.reply('Генерирую текст...');
      } else {
        await ctx.telegram.editMessageText(reply.chat.id, reply.message_id, undefined, messageToUpdate);
      }
    }
  }

  await ctx.telegram.editMessageText(reply.chat.id, reply.message_id, undefined, fullMessage.slice(currentReplyCount * MAX_MESSAGE_LENGTH, (currentReplyCount + 1) * MAX_MESSAGE_LENGTH));
  return { fullMessage, reply };
}
