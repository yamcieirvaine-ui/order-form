import { Bot, webhookCallback, InlineKeyboard } from "grammy";

const token = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!token) {
  throw new Error("BOT_TOKEN is missing");
}

if (!OWNER_ID) {
  throw new Error("OWNER_ID is missing");
}

const bot = new Bot(token);

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://order-form-nagl.vercel.app";

const PAYMENT_QR = `${BASE_URL}/payment-qr.jpg`;
const START_IMAGE = `${BASE_URL}/start-image.jpg`;
const CONTACT = "https://t.me/yvaines_tg";

/*
  Temporary session storage.
  Note: Vercel serverless instances are not guaranteed to persist memory.
*/
const sessions =
  globalThis.__yvaineOrderSessions ||
  (globalThis.__yvaineOrderSessions = new Map());

const orders =
  globalThis.__yvaineOrders ||
  (globalThis.__yvaineOrders = new Map());

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, {
      step: "home",
      order: {},
    });
  }

  return sessions.get(userId);
}

function money(amount) {
  return `₱${Number(amount).toLocaleString("en-PH")}`;
}

function mainMenu() {
  return new InlineKeyboard()
    .text("♱ 𝙊𝙍𝘿𝙀𝙍 𝙁𝙊𝙍𝙈 ♱", "order")
    .row()
    .text("☾ 𝙋𝙍𝙄𝘾𝙄𝙉𝙂 ☾", "pricing")
    .row()
    .text("༒ 𝙈𝙊𝘿𝙀 𝙊𝙁 𝙋𝘼𝙔𝙈𝙀𝙉𝙏 ༒", "payment")
    .row()
    .text("♰ 𝙈𝙔 𝙊𝙍𝘿𝙀𝙍 ♰", "myorder")
    .row()
    .text("☠ 𝘾𝙊𝙉𝙏𝘼𝘾𝙏 ☠", "contact");
}

function backHome() {
  return new InlineKeyboard().text("༒ 𝙃𝙊𝙈𝙀 ༒", "home");
}

function orderMenu() {
  return new InlineKeyboard()
    .text("♱ 𝙉𝙀𝙒 𝙋𝙍𝙄𝘾𝙄𝙉𝙂 ♱", "cat_new")
    .row()
    .text("♱ 𝙉𝙊 𝙉𝙀𝙒 𝙋𝙍𝙄𝘾𝙄𝙉𝙂 ♱", "cat_nonew")
    .row()
    .text("☠ 𝙔𝙀𝘼𝙍 𝙊𝙇𝘿 ☠", "cat_old")
    .row()
    .text("𓋹 𝙁𝙊𝙍𝙀𝙄𝙂𝙉 𓋹", "cat_foreign")
    .row()
    .text("𓋹 𝙋𝙃𝘽 𓋹", "cat_phb")
    .row()
    .text("༒ 𝙃𝙊𝙈𝙀", "home");
}

const foreignPrices = [
  ["700", 400],
  ["800", 600],
  ["900", 650],
  ["1000", 750],
  ["1.2K", 850],
  ["1.4K", 1150],
  ["2.5K", 1800],
  ["5.1K", 3500],
  ["6K", 4500],
  ["7K", 5300],
  ["12K", 8300],
  ["20K", 9700],
];

const phbPrices = [
  ["100", 380],
  ["200", 460],
  ["300", 670],
  ["400", 790],
  ["500", 890],
  ["600", 970],
  ["700", 1500],
  ["800", 1800],
  ["900", 1900],
  ["1K", 2400],
  ["2.5K", 3200],
  ["3K", 4300],
];

function pricingText() {
  return `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐘𝐕𝐀𝐈𝐍𝐄𝐋𝐘 𝐏𝐑𝐈𝐂𝐈𝐍𝐆 ♱

༒︎ 𝙉𝙀𝙒 𝙋𝙍𝙄𝘾𝙄𝙉𝙂
• 100 followers — ₱90
• 10+ accounts — ₱70/account

☠︎︎ 𝙉𝙊 𝙉𝙀𝙒 𝙋𝙍𝙄𝘾𝙄𝙉𝙂
• 100 followers — ₱120
• 10+ accounts — ₱90/account

𓋹 𝙔𝙀𝘼𝙍 𝙊𝙇𝘿
• 2022–2024 — ₱350
• 2015–2019 — ₱550

♱ 𝟮𝟬𝟮𝟲 𝙁𝙊𝙍𝙀𝙄𝙂𝙉
${foreignPrices.map(([size, price]) => `• ${size} — ${money(price)}`).join("\n")}

♱ 𝟮𝟬𝟮𝟲 𝙋𝙃𝘽
${phbPrices.map(([size, price]) => `• ${size} — ${money(price)}`).join("\n")}

☠︎︎ 𝙔𝙀𝘼𝙍 𝙊𝙇𝘿 𝘼𝘿𝘿-𝙊𝙉
For Foreign / PHB:
+ ₱350 per account

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`;
}

function paymentText() {
  return `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐌𝐎𝐃𝐄 𝐎𝐅 𝐏𝐀𝐘𝐌𝐄𝐍𝐓 ♱

💳 𝙂𝘾𝘼𝙎𝙃

Account Name:
𝙒𝙞𝙡𝙡𝙞𝙚 𝙍𝙚𝙦𝙪𝙞𝙧𝙤𝙣

Please make sure the amount sent
matches your exact order total.

After payment, submit your receipt
through the order form.

☠︎︎ Payment is manually verified.
A submitted receipt does not automatically
mean that payment has been approved.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`;
}

function categoryName(category) {
  const names = {
    new: "NEW PRICING",
    nonew: "NO NEW PRICING",
    old: "YEAR OLD",
    foreign: "2026 FOREIGN",
    phb: "2026 PHB",
  };

  return names[category] || category;
}

function showQuantityKeyboard(category) {
  if (category === "foreign") {
    return new InlineKeyboard(
      foreignPrices.map(([size, price]) => [
        {
          text: `${size} — ${money(price)}`,
          callback_data: `foreign_${size}_${price}`,
        },
      ])
    ).row().text("༒ 𝙃𝙊𝙈𝙀", "home");
  }

  if (category === "phb") {
    return new InlineKeyboard(
      phbPrices.map(([size, price]) => [
        {
          text: `${size} — ${money(price)}`,
          callback_data: `phb_${size}_${price}`,
        },
      ])
    ).row().text("༒ 𝙃𝙊𝙈𝙀", "home");
  }

  if (category === "old") {
    return new InlineKeyboard()
      .text("2022–2024 — ₱350", "old_350")
      .row()
      .text("2015–2019 — ₱550", "old_550")
      .row()
      .text("༒ 𝙃𝙊𝙈𝙀", "home");
  }

  return new InlineKeyboard()
    .text("1 account", `basic_${category}_1`)
    .text("5 accounts", `basic_${category}_5`)
    .row()
    .text("10 accounts", `basic_${category}_10`)
    .row()
    .text("༒ 𝙃𝙊𝙈𝙀", "home");
}

function nicheMenu(category, size, unitPrice) {
  const keyboard = new InlineKeyboard()
    .text("♱ 𝙎𝙄𝙉𝘾𝙀 𝟮𝟬𝟮𝟲 ♱", `niche_since_${category}_${size}_${unitPrice}`)
    .row()
    .text("☠ 𝙔𝙀𝘼𝙍 𝙊𝙇𝘿 (+₱350) ☠", `niche_old_${category}_${size}_${unitPrice}`)
    .row()
    .text("༒ 𝘽𝘼𝘾𝙆", "order");

  return keyboard;
}

function calculateTotal(order) {
  const quantity = Number(order.quantity || 1);
  const basePrice = Number(order.unitPrice || 0);

  const baseTotal = basePrice * quantity;

  const oldFee =
    order.niche === "year old" && (order.category === "foreign" || order.category === "phb")
      ? 350 * quantity
      : 0;

  return {
    baseTotal,
    oldFee,
    total: baseTotal + oldFee,
  };
}

function summaryText(order) {
  const totals = calculateTotal(order);

  return `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐎𝐑𝐃𝐄𝐑 𝐒𝐔𝐌𝐌𝐀𝐑𝐘 ♱

𝙘𝙖𝙩𝙚𝙜𝙤𝙧𝙮:
${categoryName(order.category)}

𝙦𝙪𝙖𝙣𝙩𝙞𝙩𝙮:
${order.quantity}

𝙣𝙞𝙘𝙝𝙚:
${order.niche || "not applicable"}

𝙗𝙖𝙨𝙚 𝙥𝙧𝙞𝙘𝙚:
${money(order.unitPrice)} × ${order.quantity}
= ${money(totals.baseTotal)}

${
  totals.oldFee > 0
    ? `𝙮𝙚𝙖𝙧-𝙤𝙡𝙙 𝙖𝙙𝙙𝙞𝙩𝙞𝙤𝙣:
₱350 × ${order.quantity}
= ${money(totals.oldFee)}

`
    : ""
}𝙩𝙤𝙩𝙖𝙡 𝙖𝙢𝙤𝙪𝙣𝙩:
♱ ${money(totals.total)} ♱

Please review your order carefully
before proceeding to payment.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`;
}

function summaryKeyboard() {
  return new InlineKeyboard()
    .text("💳 𝙋𝘼𝙔 𝙉𝙊𝙒", "pay_order")
    .row()
    .text("༒ 𝘽𝘼𝘾𝙆", "order")
    .text("☠ 𝘾𝘼𝙉𝘾𝙀𝙇", "cancel");
}

async function sendStart(ctx) {
  const session = getSession(ctx.from.id);
  session.step = "home";
  session.order = {};

  await ctx.replyWithPhoto(START_IMAGE, {
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐘𝐕𝐀𝐈𝐍𝐄𝐋𝐘 𝐎𝐑𝐃𝐄𝐑 𝐒𝐄𝐂𝐓𝐈𝐎𝐍 ♱

ᴛʜɪꜱ ʙᴏᴛ ɪꜱ ᴅᴇᴅɪᴄᴀᴛᴇᴅ ᴛᴏ ʏᴏᴜʀ
ᴏʀᴅᴇʀ ʀᴇQᴜᴇꜱᴛꜱ.

ᴘʟᴇᴀꜱᴇ ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ʙᴇʟᴏᴡ
ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ. ⛧

ᴍᴀɴᴜᴀʟ ᴏʀᴅᴇʀ ʜᴀɴᴅʟɪɴɢ
♱ ᴘʀɪᴄɪɴɢ & ɪɴꜰᴏ
𓋹 ꜱᴇʀᴠɪᴄᴇꜱ
☠︎︎ ᴄᴏɴᴛᴀᴄᴛ

ᴇᴠᴇʀʏ ʀᴇQᴜᴇꜱᴛ ɪꜱ ʜᴀɴᴅʟᴇᴅ
ᴡɪᴛʜ ᴄᴀʀᴇ & ᴀᴛᴛᴇɴᴛɪᴏɴ.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    reply_markup: mainMenu(),
  });
}

bot.command("start", async (ctx) => {
  await sendStart(ctx);
});

bot.command("cancel", async (ctx) => {
  sessions.delete(ctx.from.id);

  await ctx.reply(
    "༒ 𝙊𝙧𝙙𝙚𝙧 𝙘𝙖𝙣𝙘𝙚𝙡𝙡𝙚𝙙.\n\nSend /start to begin again.",
    { reply_markup: mainMenu() }
  );
});

bot.callbackQuery("home", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageCaption({
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐘𝐕𝐀𝐈𝐍𝐄𝐋𝐘 𝐎𝐑𝐃𝐄𝐑 𝐒𝐄𝐂𝐓𝐈𝐎𝐍 ♱

ᴛʜɪꜱ ʙᴏᴛ ɪꜱ ᴅᴇᴅɪᴄᴀᴛᴇᴅ ᴛᴏ ʏᴏᴜʀ
ᴏʀᴅᴇʀ ʀᴇQᴜᴇꜱᴛꜱ.

ᴘʟᴇᴀꜱᴇ ᴄʜᴏᴏꜱᴇ ᴀɴ ᴏᴘᴛɪᴏɴ ʙᴇʟᴏᴡ
ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ. ⛧

ᴍᴀɴᴜᴀʟ ᴏʀᴅᴇʀ ʜᴀɴᴅʟɪɴɢ
♱ ᴘʀɪᴄɪɴɢ & ɪɴꜰᴏ
𓋹 ꜱᴇʀᴠɪᴄᴇꜱ
☠︎︎ ᴄᴏɴᴛᴀᴄᴛ

ᴇᴠᴇʀʏ ʀᴇQᴜᴇꜱᴛ ɪꜱ ʜᴀɴᴅʟᴇᴅ
ᴡɪᴛʜ ᴄᴀʀᴇ & ᴀᴛᴛᴇɴᴛɪᴏɴ.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    reply_markup: mainMenu(),
  });
});

bot.callbackQuery("order", async (ctx) => {
  await ctx.answerCallbackQuery();

  const session = getSession(ctx.from.id);
  session.step = "category";
  session.order = {};

  await ctx.editMessageCaption({
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐎𝐑𝐃𝐄𝐑 𝐑𝐄𝐐𝐔𝐄𝐒𝐓 ♱

please select a category below.

choose the option that matches
the item you want to request.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    reply_markup: orderMenu(),
  });
});

bot.callbackQuery("pricing", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageCaption({
    caption: pricingText(),
    reply_markup: backHome(),
  });
});

bot.callbackQuery("payment", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.replyWithPhoto(PAYMENT_QR, {
    caption: paymentText(),
    reply_markup: backHome(),
  });
});

bot.callbackQuery("contact", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageCaption({
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐂𝐎𝐍𝐓𝐀𝐂𝐓 ♱

For questions or order assistance,
please contact:

@yvaines_tg

`,
    reply_markup: new InlineKeyboard()
      .url("☠ 𝘾𝙊𝙉𝙏𝘼𝘾𝙏 𝙔𝙑𝘼𝙄𝙉𝙀 ☠", CONTACT)
      .row()
      .text("༒ 𝙃𝙊𝙈𝙀 ༒", "home"),
  });
});

bot.callbackQuery("myorder", async (ctx) => {
  await ctx.answerCallbackQuery();

  const order = orders.get(ctx.from.id);

  if (!order) {
    await ctx.editMessageCaption({
      caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐌𝐘 𝐎𝐑𝐃𝐄𝐑 ♱

No order has been recorded yet.

Please choose ORDER FORM
to create an order request.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
      reply_markup: new InlineKeyboard()
        .text("♱ 𝙊𝙍𝘿𝙀𝙍 𝙁𝙊𝙍𝙈 ♱", "order")
        .row()
        .text("༒ 𝙃𝙊𝙈𝙀 ༒", "home"),
    });

    return;
  }

  const totals = calculateTotal(order);

  await ctx.editMessageCaption({
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐌𝐘 𝐎𝐑𝐃𝐄𝐑 ♱

category:
${categoryName(order.category)}

quantity:
${order.quantity}

niche:
${order.niche || "not applicable"}

total:
${money(totals.total)}

status:
${order.status || "pending"}

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    reply_markup: backHome(),
  });
});

for (const category of ["new", "nonew"]) {
  bot.callbackQuery(`cat_${category}`, async (ctx) => {
    await ctx.answerCallbackQuery();

    const session = getSession(ctx.from.id);
    session.order = {
      category,
    };

    await ctx.editMessageCaption({
      caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ ${categoryName(category)} ♱

please select the quantity below.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
      reply_markup: showQuantityKeyboard(category),
    });
  });
}

bot.callbackQuery("cat_old", async (ctx) => {
  await ctx.answerCallbackQuery();

  const session = getSession(ctx.from.id);
  session.order = {
    category: "old",
  };

  await ctx.editMessageCaption({
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐘𝐄𝐀𝐑 𝐎𝐋𝐃 ♱

please select the year range.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    reply_markup: showQuantityKeyboard("old"),
  });
});

for (const category of ["foreign", "phb"]) {
  bot.callbackQuery(`cat_${category}`, async (ctx) => {
    await ctx.answerCallbackQuery();

    const session = getSession(ctx.from.id);
    session.order = {
      category,
    };

    await ctx.editMessageCaption({
      caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ ${categoryName(category)} ♱

select the size/price tier below.

after selecting it, you will choose:

• since 2026
• year old (+₱350/account)

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
      reply_markup: showQuantityKeyboard(category),
    });
  });
}

bot.on("callback_query:data", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (
    data.startsWith("foreign_") ||
    data.startsWith("phb_")
  ) {
    await ctx.answerCallbackQuery();

    const [category, size, price] = data.split("_");

    const session = getSession(ctx.from.id);

    session.order = {
      ...session.order,
      category,
      size,
      quantity: 1,
      unitPrice: Number(price),
    };

    await ctx.editMessageCaption({
      caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

selected:
${categoryName(category)}

size:
${size}

price:
${money(price)} per account

now choose the niche:

♱ since 2026
☠ year old (+₱350/account)

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
      reply_markup: nicheMenu(category, size, price),
    });

    return;
  }

  if (
    data.startsWith("niche_since_") ||
    data.startsWith("niche_old_")
  ) {
    await ctx.answerCallbackQuery();

    const parts = data.split("_");

    const type = parts[1];
    const category = parts[2];
    const size = parts[3];
    const unitPrice = Number(parts[4]);

    const session = getSession(ctx.from.id);

    session.order = {
      ...session.order,
      category,
      size,
      quantity: 1,
      unitPrice,
      niche: type === "since" ? "since 2026" : "year old",
    };

    await ctx.editMessageCaption({
      caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

${summaryText(session.order)}

If you need more than 1 account,
send the quantity as a number below.

Example:
2
5
10

`,
      reply_markup: new InlineKeyboard()
        .text("1 account", "qty_1")
        .text("2 accounts", "qty_2")
        .row()
        .text("5 accounts", "qty_5")
        .text("10 accounts", "qty_10")
        .row()
        .text("༒ 𝘾𝙊𝙉𝙁𝙄𝙍𝙈 𝙏𝙊𝙏𝘼𝙇 ༒", "confirm_quantity")
        .row()
        .text("༒ 𝘽𝘼𝘾𝙆", "order"),
    });

    return;
  }

  if (data.startsWith("basic_")) {
    await ctx.answerCallbackQuery();

    const [, category, quantity] = data.split("_");

    let unitPrice;

    if (category === "new") {
      unitPrice = Number(quantity) >= 10 ? 70 : 90;
    } else {
      unitPrice = Number(quantity) >= 10 ? 90 : 120;
    }

    const session = getSession(ctx.from.id);

    session.order = {
      category,
      quantity: Number(quantity),
      unitPrice,
      niche: "not applicable",
    };

    await ctx.editMessageCaption({
      caption: summaryText(session.order),
      reply_markup: summaryKeyboard(),
    });

    return;
  }

  if (data.startsWith("old_")) {
    await ctx.answerCallbackQuery();

    const unitPrice = Number(data.split("_")[1]);

    const session = getSession(ctx.from.id);

    session.order = {
      category: "old",
      quantity: 1,
      unitPrice,
      niche: "year range",
    };

    await ctx.editMessageCaption({
      caption: summaryText(session.order),
      reply_markup: new InlineKeyboard()
        .text("1 account", "oldqty_1")
        .text("2 accounts", "oldqty_2")
        .row()
        .text("5 accounts", "oldqty_5")
        .text("10 accounts", "oldqty_10")
        .row()
        .text("༒ 𝙋𝘼𝙔 𝙉𝙊𝙒 ༒", "pay_order")
        .row()
        .text("༒ 𝘽𝘼𝘾𝙆", "order"),
    });

    return;
  }

  if (data.startsWith("qty_")) {
    await ctx.answerCallbackQuery();

    const quantity = Number(data.split("_")[1]);
    const session = getSession(ctx.from.id);

    session.order.quantity = quantity;

    await ctx.editMessageCaption({
      caption: summaryText(session.order),
      reply_markup: summaryKeyboard(),
    });

    return;
  }

  if (data.startsWith("oldqty_")) {
    await ctx.answerCallbackQuery();

    const quantity = Number(data.split("_")[1]);
    const session = getSession(ctx.from.id);

    session.order.quantity = quantity;

    await ctx.editMessageCaption({
      caption: summaryText(session.order),
      reply_markup: summaryKeyboard(),
    });

    return;
  }

  if (data === "confirm_quantity") {
    await ctx.answerCallbackQuery();

    const session = getSession(ctx.from.id);

    await ctx.editMessageCaption({
      caption: summaryText(session.order),
      reply_markup: summaryKeyboard(),
    });

    return;
  }
});

bot.callbackQuery("cancel", async (ctx) => {
  await ctx.answerCallbackQuery();

  sessions.delete(ctx.from.id);

  await ctx.editMessageCaption({
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐎𝐑𝐃𝐄𝐑 𝐂𝐀𝐍𝐂𝐄𝐋𝐋𝐄𝐃 ♱

Your current order has been cancelled.

Send /start to begin again.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    reply_markup: mainMenu(),
  });
});

bot.callbackQuery("pay_order", async (ctx) => {
  await ctx.answerCallbackQuery();

  const session = getSession(ctx.from.id);
  const order = session.order;

  if (!order || !order.category) {
    await ctx.reply("Please start a new order with /start.");
    return;
  }

  const totals = calculateTotal(order);

  order.status = "awaiting payment";
  orders.set(ctx.from.id, {
    ...order,
    userId: ctx.from.id,
    username: ctx.from.username || "",
    firstName: ctx.from.first_name || "",
  });

  await ctx.replyWithPhoto(PAYMENT_QR, {
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐏𝐀𝐘𝐌𝐄𝐍𝐓 ♱

Account Name:
𝙒𝙞𝙡𝙡𝙞𝙚 𝙍𝙚𝙦𝙪𝙞𝙧𝙤𝙣

Mode:
𝙂𝘾𝘼𝙎𝙃

Order total:
♱ ${money(totals.total)} ♱

Please send the exact amount.

After payment, send your receipt
as a photo in this chat.

Your receipt will be manually reviewed.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
  });

  await ctx.reply(
    "☠︎︎ 𝙎𝙀𝙉𝘿 𝙔𝙊𝙐𝙍 𝙋𝘼𝙔𝙈𝙀𝙉𝙏 𝙍𝙀𝘾𝙀𝙄𝙋𝙏 𝙃𝙀𝙍𝙀 ☠︎︎"
  );
});

bot.on("message:photo", async (ctx) => {
  const session = getSession(ctx.from.id);

  if (!session?.order?.category) {
    await ctx.reply(
      "Please start an order first using /start."
    );
    return;
  }

  const order = session.order;
  const totals = calculateTotal(order);

  order.status = "payment verification";
  orders.set(ctx.from.id, {
    ...order,
    userId: ctx.from.id,
    username: ctx.from.username || "",
    firstName: ctx.from.first_name || "",
  });

  const photos = ctx.message.photo;
  const largest = photos[photos.length - 1];

  const ownerKeyboard = new InlineKeyboard()
    .text("♱ 𝘾𝙊𝙉𝙁𝙄𝙍𝙈 𝙋𝘼𝙔𝙈𝙀𝙉𝙏 ♱", `confirm_${ctx.from.id}`)
    .row()
    .text("☠ 𝙁𝘼𝙄𝙇 / 𝙍𝙀𝙅𝙀𝘾𝙏 ☠", `fail_${ctx.from.id}`);

  await bot.api.sendPhoto(OWNER_ID, largest.file_id, {
    caption: `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐍𝐄𝐖 𝐏𝐀𝐘𝐌𝐄𝐍𝐓 𝐑𝐄𝐐𝐔𝐄𝐒𝐓 ♱

Customer:
${ctx.from.first_name || "Unknown"}

Username:
@${ctx.from.username || "none"}

Telegram ID:
${ctx.from.id}

Category:
${categoryName(order.category)}

Quantity:
${order.quantity}

Niche:
${order.niche || "not applicable"}

Base total:
${money(totals.baseTotal)}

Year-old fee:
${money(totals.oldFee)}

TOTAL:
♱ ${money(totals.total)} ♱

Status:
𝙈𝘼𝙉𝙐𝘼𝙇 𝙑𝙀𝙍𝙄𝙁𝙄𝘾𝘼𝙏𝙄𝙊𝙉

Do not approve automatically.
Verify the actual payment and amount first.
`,
    reply_markup: ownerKeyboard,
  });

  await ctx.reply(`
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐑𝐄𝐂𝐄𝐈𝐏𝐓 𝐑𝐄𝐂𝐄𝐈𝐕𝐄𝐃 ♱

Your receipt has been submitted
for manual verification.

Please wait for confirmation.

No order release should happen
until the payment has been verified.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`);
});

bot.callbackQuery(/^confirm_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (String(ctx.from.id) !== String(OWNER_ID)) {
    await ctx.answerCallbackQuery({
      text: "Owner only.",
      show_alert: true,
    });
    return;
  }

  const customerId = Number(ctx.match[1]);
  const order = orders.get(customerId);

  if (!order) {
    await ctx.editMessageCaption({
      caption: "Order information is no longer available.",
    });
    return;
  }

  order.status = "payment confirmed";
  orders.set(customerId, order);

  await bot.api.sendMessage(
    customerId,
    `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐏𝐀𝐘𝐌𝐄𝐍𝐓 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐄𝐃 ♱

Your payment has been manually verified.

For your order details, please contact:

@yvaines_tg

Your order will be handled from there.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    {
      reply_markup: new InlineKeyboard()
        .url("♱ 𝘾𝙊𝙉𝙏𝘼𝘾𝙏 @𝙔𝙑𝘼𝙄𝙉𝙀𝙎_𝙏𝙂 ♱", CONTACT)
        .row()
        .text("☠ 𝙄𝙏𝙀𝙈 𝙍𝙀𝘾𝙀𝙄𝙑𝙀𝘿 ☠", `received_${customerId}`),
    }
  );

  await ctx.editMessageCaption({
    caption:
      ctx.callbackQuery.message.caption +
      "\n\n♱ PAYMENT CONFIRMED BY OWNER ♱",
  });
});

bot.callbackQuery(/^fail_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (String(ctx.from.id) !== String(OWNER_ID)) {
    await ctx.answerCallbackQuery({
      text: "Owner only.",
      show_alert: true,
    });
    return;
  }

  const customerId = Number(ctx.match[1]);
  const order = orders.get(customerId);

  if (order) {
    order.status = "payment failed";
    orders.set(customerId, order);
  }

  await bot.api.sendMessage(
    customerId,
    `
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

☠ 𝐏𝐀𝐘𝐌𝐄𝐍𝐓 𝐍𝐎𝐓 𝐕𝐄𝐑𝐈𝐅𝐈𝐄𝐃 ☠

Please send the correct amount/receipt
to make your purchase.

Make sure the amount you send matches
the exact order total shown above.

After making the payment, send the
new receipt here for another verification.

No order release will happen until
payment is verified.

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`,
    {
      reply_markup: new InlineKeyboard()
        .text("♱ 𝙋𝘼𝙔 𝘼𝙂𝘼𝙄𝙉 ♱", "pay_order")
        .row()
        .text("༒ 𝙃𝙊𝙈𝙀 ༒", "home"),
    }
  );

  await ctx.editMessageCaption({
    caption:
      ctx.callbackQuery.message.caption +
      "\n\n☠ PAYMENT REJECTED / FAILED VERIFICATION ☠",
  });
});

bot.callbackQuery(/^received_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const customerId = Number(ctx.match[1]);

  if (customerId !== ctx.from.id) {
    await ctx.answerCallbackQuery({
      text: "This button belongs to another order.",
      show_alert: true,
    });
    return;
  }

  const order = orders.get(customerId);

  if (order) {
    order.status = "completed";
    orders.set(customerId, order);
  }

  await ctx.editMessageText(`
༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

thank you so much for your order ♡

your order has been successfully completed.

we truly appreciate your trust and support. 🕯️

༒︎☠︎︎ ⋆₊ ♱𓋹⛧𓋹♱ ₊⋆ ☠︎︎༒︎
`);

  await bot.api.sendMessage(
    OWNER_ID,
    `
♱ 𝐎𝐑𝐃𝐄𝐑 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐄𝐃 ♱

Customer:
${ctx.from.first_name || "Unknown"}

Username:
@${ctx.from.username || "none"}

Telegram ID:
${ctx.from.id}

The customer confirmed that the item
was received.
`
  );
});

export const POST = webhookCallback(bot, "std/http");
export const runtime = "nodejs";
