import * as cheerio from 'cheerio';
import { Markup, Telegraf } from 'telegraf';
import { sendStream } from './send-stream';
import { env } from './utils/env';
import { generateNumbers } from './utils/utils';

// Store fullMessage by message ID for save functionality
const messageStore = new Map<number, string>();


async function fetchRenderedHtml(url: string) {
    const response = await fetch(url);
    const html = await response.text();

    const $ = cheerio.load(html);
    const cleanHtml = $('body').prop("innerHTML");
    return cleanHtml;
}


const bot = new Telegraf(env.TELEGRAM_BOT_TOKEN);

bot.start((ctx) => ctx.reply('Пришли мне ссылку на сайт и я найду для тебя аккорды'));


bot.action('like', async (ctx) => {
    if (!ctx.callbackQuery?.message) {
        await ctx.answerCbQuery("Error: Message not found");
        return;
    }

    const messageId = ctx.callbackQuery.message.message_id;
    const fullMessage = messageStore.get(messageId);

    if (!fullMessage) {
        await ctx.answerCbQuery("Error: Message content not found");
        return;
    }

    console.log('Saving fullMessage:', fullMessage);
    await ctx.answerCbQuery("Message saved!");

    // Here you can add your save logic
    // For example, save to database, file, etc.
    await ctx.reply(`Сохранено! Длина сообщения: ${fullMessage.length} символов`);
});

bot.on('message', async (ctx) => {
    if ('text' in ctx.message) {
        const usersInput = ctx.message.text;
        // const urlParsed = z.url().safeParse(usersInput);
        // if (!urlParsed.success) {
        //     ctx.reply('Неверный формат ссылки \n Пример: https://www.google.com');
        //     return;
        // }
        // const reply = await ctx.reply('Начал грузить страницу');
        // const html = await fetchRenderedHtml(urlParsed.data.toString()) || "";

        // const { textStream } = await getChords(html);
        // const { fullMessage, reply: lastReply } = await sendStream(ctx, textStream, { chunkSize: 200, reply });
        const stream = generateNumbers(0, 2000, 1);

        const { fullMessage, reply: lastReply } = await sendStream(ctx, stream, { chunkSize: 1000 });

        // Store the fullMessage with the message ID
        messageStore.set(lastReply.message_id, fullMessage);

        ctx.telegram.editMessageReplyMarkup(lastReply.chat.id, lastReply.message_id, undefined,
            Markup.inlineKeyboard([
                Markup.button.callback('💾 save', 'like'),
            ]).reply_markup
        );
    }
});

bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
