import { Bot, webhookCallback, InlineKeyboard, InputFile } from "grammy";
import { readFile } from "node:fs/promises";

const token = process.env.BOT_TOKEN;
const ownerId = process.env.OWNER_CHAT_ID;
const paymentQrUrl = process.env.PAYMENT_QR_URL;
const paymentQrPath = new URL("../../../../public/payment-qr.jpg", import.meta.url);

if (!token) throw new Error("BOT_TOKEN is missing");
if (!ownerId) throw new Error("OWNER_CHAT_ID is missing");

const bot = new Bot(token);

const PRODUCTS = [
  {
    id: "new_single",
    group: "NEW PRICING",
    label: "100 followers — NEW",
    price: 90,
    unit: "account"
  },
  {
    id: "new_10",
    group: "NEW PRICING",
    label: "100 followers — NEW (10pcs)",
    price: 70,
    unit: "account"
  },
  {
    id: "old_single",
    group: "NO NEW PRICING",
    label: "100 followers — NO NEW",
    price: 120,
    unit: "account"
  },
  {
    id: "old_10",
    group: "NO NEW PRICING",
    label: "100 followers — NO NEW (10pcs)",
    price: 90,
    unit: "account"
  },
  {
    id: "year_2022_2024",
    group: "YEAR OLD",
    label: "100 followers — 2022–2024",
    price: 350,
    unit: "account"
  },
  {
    id: "year_2015_2019",
    group: "YEAR OLD",
    label: "100 followers — 2015–2019",
    price: 550,
    unit: "account"
  },
  { id: "foreign_700", group: "2026 FOREIGN", label: "700 followers", price: 400, unit: "account" },
  { id: "foreign_800", group: "2026 FOREIGN", label: "800 followers", price: 600, unit: "account" },
  { id: "foreign_900", group: "2026 FOREIGN", label: "900 followers", price: 650, unit: "account" },
  { id: "foreign_1000", group: "2026 FOREIGN", label: "1000 followers", price: 750, unit: "account" },
  { id: "foreign_1200", group: "2026 FOREIGN", label: "1.2K followers", price: 850, unit: "account" },
  { id: "foreign_1400", group: "2026 FOREIGN", label: "1.4K followers", price: 1150, unit: "account" },
  { id: "foreign_2500", group: "2026 FOREIGN", label: "2.5K followers", price: 1800, unit: "account" },
  { id: "foreign_5100", group: "2026 FOREIGN", label: "5.1K followers", price: 3500, unit: "account" },
  { id: "foreign_6000", group: "2026 FOREIGN", label: "6K followers", price: 4500, unit: "account" },
  { id: "foreign_7000", group: "2026 FOREIGN", label: "7K followers", price: 5300, unit: "account" },
  { id: "foreign_12000", group: "2026 FOREIGN", label: "12K followers", price: 8300, unit: "account" },
  { id: "foreign_20000", group: "2026 FOREIGN", label: "20K followers", price: 9700, unit: "account" },
  { id: "phb_100", group: "2026 PHB", label: "100 followers", price: 380, unit: "account" },
  { id: "phb_200", group: "2026 PHB", label: "200 followers", price: 460, unit: "account" },
  { id: "phb_300", group: "2026 PHB", label: "300 followers", price: 670, unit: "account" },
  { id: "phb_400", group: "2026 PHB", label: "400 followers", price: 790, unit: "account" },
  { id: "phb_500", group: "2026 PHB", label: "500 followers", price: 890, unit: "account" },
  { id: "phb_600", group: "2026 PHB", label: "600 followers", price: 970, unit: "account" },
  { id: "phb_700", group: "2026 PHB", label: "700 followers", price: 1500, unit: "account" },
  { id: "phb_800", group: "2026 PHB", label: "800 followers", price: 1800, unit: "account" },
  { id: "phb_900", group: "2026 PHB", label: "900 followers", price: 1900, unit: "account" },
  { id: "phb_1000", group: "2026 PHB", label: "1K followers", price: 2400, unit: "account" },
  { id: "phb_2500", group: "2026 PHB", label: "2.5K followers", price: 3200, unit: "account" },
  { id: "phb_3000", group: "2026 PHB", label: "3K followers", price: 4300, unit: "account" }
];

const NICHE_OPTIONS = [
  "Any",
  "Fashion",
  "K-pop",
  "Lifestyle",
  "Beauty",
  "Gaming",
  "US",
  "Other"
];

const sessions = globalThis.__yvaineGothicSessions ?? (globalThis.__yvaineGothicSessions = new Map());
const orders = globalThis.__yvaineGothicOrders ?? (globalThis.__yvaineGothicOrders = new Map());

function money(n) {
  return `₱${Number(n).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function mainMenu() {
  return new InlineKeyboard()
    .text("🦇 𝕻𝖑𝖆𝖈𝖊 𝕺𝖗𝖉𝖊𝖗", "order:start")
    .row()
    .text("🕯️ 𝕸𝖞 𝕺𝖗𝖉𝖊𝖗", "order:current");
}

function productMenu() {
  const kb = new InlineKeyboard();
  let currentGroup = "";
  for (const p of PRODUCTS) {
    if (p.group !== currentGroup) {
      currentGroup = p.group;
      kb.text(`━━ ${p.group} ━━`, "noop").row();
    }
    kb.text(`${p.label} • ${money(p.price)}`, `product:${p.id}`).row();
  }
  kb.text("✦ Cancel", "order:cancel");
  return kb;
}

function quantityMenu() {
  return new InlineKeyboard()
    .text("1", "qty:1").text("2", "qty:2").text("3", "qty:3").row()
    .text("4", "qty:4").text("5", "qty:5").text("10", "qty:10").row()
    .text("✦ Cancel", "order:cancel");
}

function nicheMenu() {
  const kb = new InlineKeyboard();
  for (const n of NICHE_OPTIONS) {
    kb.text(n, `niche:${encodeURIComponent(n)}`).row();
  }
  kb.text("✦ Cancel", "order:cancel");
  return kb;
}

function paymentMenu(orderId) {
  return new InlineKeyboard()
    .text("📎 send receipt", `receipt:${orderId}`)
    .row()
    .text("🦇 view pricing", "order:start")
    .text("✦ cancel", `cancelorder:${orderId}`)
    .row()
    .text("⌂ main menu", "menu:main");
}

function ownerMenu(orderId) {
  return new InlineKeyboard()
    .text("🩸 confirm payment", `owner:confirm:${orderId}`)
    .row()
    .text("☠️ failed / reject", `owner:reject:${orderId}`);
}

function receivedMenu(orderId) {
  return new InlineKeyboard()
    .text("♡ mark item received", `owner:received:${orderId}`);
}

function getSession(id) {
  return sessions.get(id) ?? {};
}

function summary(order) {
  return [
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙",
    "        ♡ yvaine order ♡",
    "⁺‧₊˚ ཐི⋆♱⋆ཋྀ ˚₊‧⁺",
    "",
    `🕯 product: ${order.product.label}`,
    `🦇 quantity: ${order.quantity}`,
    `🕸 niche: ${order.niche}`,
    `♱ price each: ${money(order.product.price)}`,
    "",
    `༺ total: ${money(order.total)} ༻`,
    "",
    "please pay the exact amount shown above.",
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙"
  ].join("\n");
}

async function sendPayment(ctx, order) {
  const text =
    `${summary(order)}\n\n` +
    "╭─────── payment ───────╮\n" +
    "♡ mode of payment: gcash\n" +
    "♡ account name: Willie Requiron\n\n" +
    `♡ amount to send: ${money(order.total)}\n\n` +
    "scan the gcash qr below, then send your receipt here.\n\n" +
    "⚠️ receipts are manually reviewed by yvaine. " +
    "account details are not released until the payment is actually verified.\n" +
    "╰──────────────────────╯";

  if (paymentQrUrl) {
    await ctx.replyWithPhoto(paymentQrUrl, {
      caption: text,
      reply_markup: paymentMenu(order.id)
    });
  } else {
    const qrBuffer = await readFile(paymentQrPath);
    await ctx.replyWithPhoto(new InputFile(qrBuffer, "payment-qr.jpg"), {
      caption: text,
      reply_markup: paymentMenu(order.id)
    });
  }
}

bot.callbackQuery("noop", async (ctx) => {
  await ctx.answerCallbackQuery();
});

bot.command("start", async (ctx) => {
  sessions.set(ctx.from.id, {});
  await ctx.reply(
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙\n\n" +
    "⁺‧₊˚ ཐི⋆♱⋆ཋྀ ˚₊‧⁺\n" +
    "♡ welcome to yvaine's order bot ♡\n\n" +
    "choose your order below and follow the steps carefully.\n\n" +
    "♱ every payment is manually verified before account details are released.\n\n" +
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙",
    { reply_markup: mainMenu() }
  );
});

bot.command("cancel", async (ctx) => {
  sessions.delete(ctx.from.id);
  await ctx.reply("☾ Order process cancelled.", { reply_markup: mainMenu() });
});

bot.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  sessions.set(ctx.from.id, {});
  await ctx.reply(
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙\n\n" +
    "♡ yvaine's order menu ♡\n\n" +
    "choose an option below.\n\n" +
    "⁺‧₊˚ ཐི⋆♱⋆ཋྀ ˚₊‧⁺",
    { reply_markup: mainMenu() }
  );
});

bot.callbackQuery("order:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  sessions.set(ctx.from.id, { step: "product" });
  await ctx.reply(
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙\n♡ choose your product ♡\n⁺‧₊˚ ཐི⋆♱⋆ཋྀ ˚₊‧⁺",
    { reply_markup: productMenu() }
  );
});

bot.callbackQuery("order:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();
  sessions.delete(ctx.from.id);
  await ctx.reply("☾ Cancelled.", { reply_markup: mainMenu() });
});

bot.callbackQuery("order:current", async (ctx) => {
  await ctx.answerCallbackQuery();
  const list = [...orders.values()]
    .filter(o => o.userId === ctx.from.id)
    .sort((a, b) => b.createdAt - a.createdAt);

  const pending = list.find(o =>
    ["awaiting_payment", "receipt_submitted", "payment_failed"].includes(o.status)
  );

  if (!pending) {
    await ctx.reply("No pending order found. ☾", { reply_markup: mainMenu() });
    return;
  }

  await ctx.reply(
    `${summary(pending)}\n\nStatus: ${pending.status}`,
    { reply_markup: pending.status !== "receipt_submitted" ? paymentMenu(pending.id) : undefined }
  );
});

bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const product = PRODUCTS.find(p => p.id === ctx.match[1]);
  if (!product) return ctx.reply("Product not found. Send /start again.");

  sessions.set(ctx.from.id, {
    step: "quantity",
    productId: product.id
  });

  await ctx.reply(
    `☾ Selected: ${product.label}\n` +
    `Price: ${money(product.price)} per account\n\n` +
    "Choose quantity:",
    { reply_markup: quantityMenu() }
  );
});

bot.callbackQuery(/^qty:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const s = getSession(ctx.from.id);
  const product = PRODUCTS.find(p => p.id === s.productId);
  if (!product) return ctx.reply("Session expired. Send /start again.");

  const quantity = Number(ctx.match[1]);
  sessions.set(ctx.from.id, { ...s, step: "niche", quantity });

  await ctx.reply(
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙\n♡ choose your niche ♡\n⁺‧₊˚ ཐི⋆♱⋆ཋྀ ˚₊‧⁺",
    { reply_markup: nicheMenu() }
  );
});

bot.callbackQuery(/^niche:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const s = getSession(ctx.from.id);
  const product = PRODUCTS.find(p => p.id === s.productId);
  if (!product) return ctx.reply("Session expired. Send /start again.");

  const niche = decodeURIComponent(ctx.match[1]);
  const total = product.price * s.quantity;
  const orderId = `YV-${Date.now()}-${ctx.from.id}`;

  const order = {
    id: orderId,
    userId: ctx.from.id,
    username: ctx.from.username ? `@${ctx.from.username}` : "(no username)",
    firstName: ctx.from.first_name || "",
    product,
    quantity: s.quantity,
    niche,
    total,
    status: "awaiting_payment",
    createdAt: Date.now()
  };

  orders.set(orderId, order);
  sessions.set(ctx.from.id, { step: "payment", orderId });

  await ctx.reply(summary(order));
  await sendPayment(ctx, order);

  await bot.api.sendMessage(
    ownerId,
    "🩸 𝕹𝕰𝖂 𝕺𝕽𝕯𝕰𝕽\n\n" +
    `${summary(order)}\n\n` +
    `Order ID: ${order.id}\n` +
    `Customer: ${order.username}\n` +
    `Name: ${order.firstName}\n\n` +
    "Waiting for payment receipt.",
  );
});

bot.callbackQuery(/^receipt:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const order = orders.get(ctx.match[1]);

  if (!order || order.userId !== ctx.from.id) {
    await ctx.reply("Order not found.");
    return;
  }

  if (!["awaiting_payment", "payment_failed"].includes(order.status)) {
    await ctx.reply(`Current order status: ${order.status}`);
    return;
  }

  sessions.set(ctx.from.id, { step: "receipt", orderId: order.id });

  await ctx.reply(
    `📎 𝕽𝖊𝖈𝖊𝖎𝖕𝖙 𝖘𝖚𝖇𝖒𝖎𝖘𝖘𝖎𝖔𝖓\n\n` +
    `Required amount: ${money(order.total)}\n\n` +
    "Send the receipt as a photo or document."
  );
});

async function forwardReceipt(ctx, order, type, fileId) {
  order.status = "receipt_submitted";
  order.receiptFileId = fileId;
  orders.set(order.id, order);

  await ctx.reply(
    "☾ Receipt received.\n\n" +
    "It has been forwarded to Yvaine for verification. " +
    "Please wait for confirmation."
  );

  const caption =
    "🔔 𝕻𝕬𝖄𝕸𝕰𝕹𝕿 𝕽𝕰𝕮𝕰𝕴𝕻𝕿\n\n" +
    `${summary(order)}\n\n` +
    `Order ID: ${order.id}\n` +
    `Customer: ${order.username}\n` +
    `Name: ${order.firstName}\n\n` +
    "payment method: gcash\n" +
    "account name: Willie Requiron\n\n" +
    "⚠️ verify the actual received transaction and amount. " +
    "do not approve from the screenshot alone.";

  if (type === "photo") {
    await bot.api.sendPhoto(ownerId, fileId, {
      caption,
      reply_markup: ownerMenu(order.id)
    });
  } else {
    await bot.api.sendDocument(ownerId, fileId, {
      caption,
      reply_markup: ownerMenu(order.id)
    });
  }
}

bot.on("message:photo", async (ctx) => {
  const s = getSession(ctx.from.id);
  if (s.step !== "receipt" || !s.orderId) return;

  const order = orders.get(s.orderId);
  if (!order) return ctx.reply("Order not found. Send /start again.");

  const photo = ctx.message.photo.at(-1);
  await forwardReceipt(ctx, order, "photo", photo.file_id);
});

bot.on("message:document", async (ctx) => {
  const s = getSession(ctx.from.id);
  if (s.step !== "receipt" || !s.orderId) return;

  const order = orders.get(s.orderId);
  if (!order) return ctx.reply("Order not found. Send /start again.");

  await forwardReceipt(ctx, order, "document", ctx.message.document.file_id);
});

bot.callbackQuery(/^owner:confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery("Payment confirmed.");

  if (String(ctx.from.id) !== String(ownerId)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const order = orders.get(ctx.match[1]);
  if (!order) return ctx.reply("Order not found.");

  if (order.status !== "receipt_submitted") {
    return ctx.reply(`Cannot confirm. Current status: ${order.status}`);
  }

  order.status = "confirmed";
  order.confirmedAt = Date.now();
  orders.set(order.id, order);

  await bot.api.sendMessage(
    order.userId,
    "╔════════════════════╗\n" +
    "     🩸 𝕻𝕬𝖄𝕸𝕰𝕹𝕿 𝕮𝕺𝕹𝕱𝕴𝕽𝕸𝕰𝕯\n" +
    "╚════════════════════╝\n\n" +
    `${summary(order)}\n\n` +
    "Your payment has been verified by Yvaine.\n\n" +
    "🦇 𝕮𝖔𝖓𝖙𝖆𝖈𝖙 @yvaines_tg 𝖋𝖔𝖗 𝖆𝖈𝖈𝖔𝖚𝖓𝖙 𝖉𝖊𝖙𝖆𝖎𝖑𝖘.",
    {
      reply_markup: new InlineKeyboard()
        .url("🕯️ contact @yvaines_tg", "https://t.me/yvaines_tg")
        .row()
        .text("♡ item received", `received:${order.id}`)
    }
  );

  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply(
    `☾ ${order.id} confirmed. Customer notified.\n\n` +
    "The customer can now tap “♡ item received” after receiving the account details."
  );
});

bot.callbackQuery(/^received:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery("Thank you for confirming.");

  const order = orders.get(ctx.match[1]);
  if (!order || order.userId !== ctx.from.id) {
    await ctx.reply("Order not found.");
    return;
  }

  if (order.status !== "confirmed") {
    await ctx.reply("This order has not been confirmed yet.");
    return;
  }

  order.status = "item_received";
  order.receivedAt = Date.now();
  orders.set(order.id, order);

  await ctx.reply(
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙\n\n" +
    "♡ thank you for your purchase ♡\n\n" +
    "we're happy to have served you. thank you for trusting yvaine and for completing your order with us. " +
    "we hope you enjoy your account. ♡\n\n" +
    "please keep your account details safe and secure.\n\n" +
    "⁺‧₊˚ ཐི⋆♱⋆ཋྀ ˚₊‧⁺\n" +
    "thank you for choosing yvaine. ♡\n\n" +
    "‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙"
  );

  await bot.api.sendMessage(
    ownerId,
    "♡ item received confirmation ♡\n\n" +
    `order id: ${order.id}\n` +
    `customer: ${order.username}\n` +
    `total: ${money(order.total)}\n\n` +
    "the customer confirmed that the item/account details were received."
  );

  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
});

bot.callbackQuery(/^owner:reject:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery("Order rejected.");

  if (String(ctx.from.id) !== String(ownerId)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const order = orders.get(ctx.match[1]);
  if (!order) return ctx.reply("Order not found.");

  order.status = "payment_failed";
  order.failedAt = Date.now();
  orders.set(order.id, order);

  sessions.set(order.userId, { step: "payment", orderId: order.id });

  await bot.api.sendMessage(
    order.userId,
    "╔════════════════════╗\n" +
    "       ☠️ 𝕻𝕬𝖄𝕸𝕰𝕹𝕿 𝕱𝕬𝕴𝕷𝕰𝕯\n" +
    "╚════════════════════╝\n\n" +
    `Order total: ${money(order.total)}\n\n` +
    "Please send the correct amount/receipt to make your purchase.\n\n" +
    "Make sure the amount you send matches the exact order total shown above. " +
    "After making the payment, send the new receipt here for another verification.\n\n" +
    "⚠️ Your order will only be released after Yvaine confirms the payment.",
    { reply_markup: paymentMenu(order.id) }
  );

  await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  await ctx.reply(`☠️ ${order.id} marked as failed. Customer can retry.`);
});

bot.callbackQuery(/^cancelorder:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const order = orders.get(ctx.match[1]);

  if (!order || order.userId !== ctx.from.id) {
    await ctx.reply("Order not found.");
    return;
  }

  if (["confirmed", "cancelled"].includes(order.status)) {
    await ctx.reply(`This order is already ${order.status}.`);
    return;
  }

  order.status = "cancelled";
  orders.set(order.id, order);
  sessions.delete(ctx.from.id);

  await ctx.reply(
    `☾ Order ${order.id} cancelled.`,
    { reply_markup: mainMenu() }
  );

  await bot.api.sendMessage(
    ownerId,
    `🚫 ORDER CANCELLED\n\nOrder ID: ${order.id}\nCustomer: ${order.username}`
  );
});

bot.on("message:text", async (ctx) => {
  const s = getSession(ctx.from.id);
  if (s.step === "receipt") {
    await ctx.reply(
      "please send the payment receipt as a photo or document.\n\n" +
    `required amount: ${money(order.total)}`
    );
  } else if (!s.step) {
    await ctx.reply("Send /start to open the Gothic order form. 🕯️");
  }
});

export const POST = webhookCallback(bot, "std/http");
export const runtime = "nodejs";
