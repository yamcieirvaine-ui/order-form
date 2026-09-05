import { Bot, webhookCallback } from "grammy";

const token = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!token) throw new Error("BOT_TOKEN is missing");

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  await ctx.reply(
`‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
        𝕐𝕍𝔸𝕀ℕ𝔼𝕃𝕐 𝕆ℝ𝔻𝔼ℝ𝕊
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

welcome ♡

please use the order form to place your order.

✦ select your niche
✦ select quantity
✦ check the price
✦ send payment
✦ send your receipt

your order will only be processed after the payment and order details have been verified.

♱ @yvaines_tg ♱`
  );
});

export const POST = webhookCallback(bot, "std/http");
export const runtime = "nodejs";
