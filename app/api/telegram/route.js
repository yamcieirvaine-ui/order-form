import { Bot, webhookCallback, InlineKeyboard, InputFile } from "grammy";

const token = process.env.BOT_TOKEN;
const OWNER_ID = Number(process.env.OWNER_ID);

if (!token) throw new Error("BOT_TOKEN is missing");
if (!OWNER_ID) throw new Error("OWNER_ID is missing");

const bot = new Bot(token);

const sessions =
  globalThis.__orderSessions ??
  (globalThis.__orderSessions = new Map());

const orders =
  globalThis.__orders ??
  (globalThis.__orders = new Map());

const PAYMENT_QR =
  "https://order-form-nagl.vercel.app/payment-qr.jpg";

const CONTACT = "https://t.me/yvaines_tg";

/* =========================
   PRICING
========================= */

const PRICES = {
  new: {
    title: "NEW PRICING",
    single: 90,
    bulk: 70,
  },

  noNew: {
    title: "NO NEW PRICING",
    single: 120,
    bulk: 90,
  },

  yearOld: {
    title: "YEAR OLD PRICES",
    y2022_2024: 350,
    y2015_2019: 550,
  },

  foreign: {
    title: "2026 FOREIGN PRICES",
    "700": 400,
    "800": 600,
    "900": 650,
    "1000": 750,
    "1200": 850,
    "1400": 1150,
    "2500": 1800,
    "5100": 3500,
    "6000": 4500,
    "7000": 5300,
    "12000": 8300,
    "20000": 9700,
  },

  phb: {
    title: "2026 PHB PRICES",
    "100": 380,
    "200": 460,
    "300": 670,
    "400": 790,
    "500": 890,
    "600": 970,
    "700": 1500,
    "800": 1800,
    "900": 1900,
    "1000": 2400,
    "2500": 3200,
    "3000": 4300,
  },
};

/* =========================
   MAIN MENU
========================= */

function mainMenu() {
  return new InlineKeyboard()
    .text("🛒 ORDER FORM", "order")
    .text("💰 PRICING", "pricing")
    .row()
    .text("💳 MODE OF PAYMENT", "payment")
    .text("📋 MY ORDER", "myorder")
    .row()
    .url("📞 CONTACT", CONTACT);
}

/* =========================
   ORDER MENU
========================= */

function orderMenu() {
  return new InlineKeyboard()
    .text("♡ NEW", "cat:new")
    .text("♡ NO NEW", "cat:noNew")
    .row()
    .text("♱ YEAR OLD", "cat:yearOld")
    .row()
    .text("✦ 2026 FOREIGN", "cat:foreign")
    .text("✦ 2026 PHB", "cat:phb")
    .row()
    .text("↩ BACK", "home");
}

/* =========================
   NICHE MENU
========================= */

function nicheMenu() {
  return new InlineKeyboard()
    .text("KPOP", "niche:kpop")
    .text("CELEBRITY", "niche:celebrity")
    .row()
    .text("INFLUENCER", "niche:influencer")
    .text("RANDOM", "niche:random")
    .row()
    .text("OTHER", "niche:other")
    .row()
    .text("↩ BACK", "order");
}

/* =========================
   PRICE DISPLAY
========================= */

function pricingText() {
  return `
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
      YVAINELY PRICES
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

╭─── ⋆ NEW PRICING ⋆ ───╮
│ • 100 followers — ₱90
│ • 100 followers — ₱70
│   per 10pcs
╰──────────────────────╯

╭─── ⋆ NO NEW PRICING ⋆ ───╮
│ • 100 followers — ₱120
│ • 100 followers — ₱90
│   per 10pcs
╰─────────────────────────╯

╭─── ⋆ YEAR OLD ⋆ ───╮
│ • 100 followers — ₱350
│   2022–2024
│
│ • 100 followers — ₱550
│   2015–2019
╰────────────────────╯

╭─── ⋆ 2026 FOREIGN ⋆ ───╮
│ • 700 — ₱400
│ • 800 — ₱600
│ • 900 — ₱650
│ • 1K — ₱750
│ • 1.2K — ₱850
│ • 1.4K — ₱1,150
│ • 2.5K — ₱1,800
│ • 5.1K — ₱3,500
│ • 6K — ₱4,500
│ • 7K — ₱5,300
│ • 12K — ₱8,300
│ • 20K — ₱9,700
╰────────────────────────╯

╭─── ⋆ 2026 PHB ⋆ ───╮
│ • 100 — ₱380
│ • 200 — ₱460
│ • 300 — ₱670
│ • 400 — ₱790
│ • 500 — ₱890
│ • 600 — ₱970
│ • 700 — ₱1,500
│ • 800 — ₱1,800
│ • 900 — ₱1,900
│ • 1K — ₱2,400
│ • 2.5K — ₱3,200
│ • 3K — ₱4,300
╰─────────────────────╯

♱ add ₱350 per account for foreign/phb
   to make it old.
`;
}

/* =========================
   START
========================= */

bot.command("start", async (ctx) => {
  sessions.set(ctx.from.id, {});

  await ctx.reply(
    `
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
       YVAINELY ORDERS
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

welcome ♡

please use the buttons below
to place your order.

♱ select your niche
♱ select quantity
♱ check your total
♱ send payment
♱ send your receipt

your order will only be processed
after owner confirmation.
`,
    { reply_markup: mainMenu() }
  );
});

/* =========================
   HOME
========================= */

bot.callbackQuery("home", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageText(
    `
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
       YVAINELY ORDERS
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

welcome ♡

choose an option below.
`,
    { reply_markup: mainMenu() }
  );
});

/* =========================
   PRICING
========================= */

bot.callbackQuery("pricing", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.editMessageText(pricingText(), {
    reply_markup: new InlineKeyboard()
      .text("🛒 ORDER NOW", "order")
      .row()
      .text("↩ BACK", "home"),
  });
});

/* =========================
   PAYMENT
========================= */

bot.callbackQuery("payment", async (ctx) => {
  await ctx.answerCallbackQuery();

  await ctx.replyWithPhoto(PAYMENT_QR, {
    caption: `
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
          PAYMENT
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

GCASH QR

NAME : Willie Requiron

please send the exact amount
shown in your order.

after payment, send your
receipt here.

♱ fake or altered receipts will
   not be accepted.
`,
    reply_markup: new InlineKeyboard()
      .text("🛒 PLACE ORDER", "order")
      .row()
      .text("↩ BACK", "home"),
  });
});

/* =========================
   ORDER START
========================= */

bot.callbackQuery("order", async (ctx) => {
  await ctx.answerCallbackQuery();

  sessions.set(ctx.from.id, {});

  await ctx.editMessageText(
    `
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
          ORDER FORM
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

choose your account category:
`,
    { reply_markup: orderMenu() }
  );
});

/* =========================
   CATEGORY
========================= */

bot.callbackQuery(/^cat:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const category = ctx.match[1];

  const s = sessions.get(ctx.from.id) || {};
  s.category = category;
  sessions.set(ctx.from.id, s);

  if (category === "yearOld") {
    await ctx.editMessageText(
      `
♱ YEAR OLD ACCOUNTS

choose account year:
`,
      {
        reply_markup: new InlineKeyboard()
          .text("2022–2024 — ₱350", "year:2022")
          .row()
          .text("2015–2019 — ₱550", "year:2015")
          .row()
          .text("↩ BACK", "order"),
      }
    );
    return;
  }

  if (category === "foreign") {
    await ctx.editMessageText(
      `
✦ 2026 FOREIGN

choose follower count:
`,
      {
        reply_markup: foreignMenu(),
      }
    );
    return;
  }

  if (category === "phb") {
    await ctx.editMessageText(
      `
✦ 2026 PHB

choose follower count:
`,
      {
        reply_markup: phbMenu(),
      }
    );
    return;
  }

  await ctx.editMessageText(
    `
♡ ${PRICES[category].title}

choose the quantity:
`,
    {
      reply_markup: new InlineKeyboard()
        .text("1 ACCOUNT", `qty:${category}:1`)
        .text("5 ACCOUNTS", `qty:${category}:5`)
        .row()
        .text("10 ACCOUNTS", `qty:${category}:10`)
        .row()
        .text("↩ BACK", "order"),
    }
  );
});

/* =========================
   YEAR
========================= */

bot.callbackQuery(/^year:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const year = ctx.match[1];

  const s = sessions.get(ctx.from.id) || {};
  s.year = year;
  s.price = year === "2022" ? 350 : 550;
  sessions.set(ctx.from.id, s);

  await ctx.editMessageText(
    `
♱ YEAR OLD ACCOUNT

price per account:
₱${s.price}

choose quantity:
`,
    {
      reply_markup: new InlineKeyboard()
        .text("1 ACCOUNT", `oldqty:1`)
        .text("5 ACCOUNTS", `oldqty:5`)
        .row()
        .text("10 ACCOUNTS", `oldqty:10`)
        .row()
        .text("↩ BACK", "order"),
    }
  );
});

/* =========================
   FOREIGN MENU
========================= */

function foreignMenu() {
  return new InlineKeyboard()
    .text("700 — ₱400", "foreign:700")
    .text("800 — ₱600", "foreign:800")
    .row()
    .text("900 — ₱650", "foreign:900")
    .text("1K — ₱750", "foreign:1000")
    .row()
    .text("1.2K — ₱850", "foreign:1200")
    .text("1.4K — ₱1,150", "foreign:1400")
    .row()
    .text("2.5K — ₱1,800", "foreign:2500")
    .text("5.1K — ₱3,500", "foreign:5100")
    .row()
    .text("6K — ₱4,500", "foreign:6000")
    .text("7K — ₱5,300", "foreign:7000")
    .row()
    .text("12K — ₱8,300", "foreign:12000")
    .text("20K — ₱9,700", "foreign:20000")
    .row()
    .text("↩ BACK", "order");
}

/* =========================
   PHB MENU
========================= */

function phbMenu() {
  return new InlineKeyboard()
    .text("100 — ₱380", "phb:100")
    .text("200 — ₱460", "phb:200")
    .row()
    .text("300 — ₱670", "phb:300")
    .text("400 — ₱790", "phb:400")
    .row()
    .text("500 — ₱890", "phb:500")
    .text("600 — ₱970", "phb:600")
    .row()
    .text("700 — ₱1,500", "phb:700")
    .text("800 — ₱1,800", "phb:800")
    .row()
    .text("900 — ₱1,900", "phb:900")
    .text("1K — ₱2,400", "phb:1000")
    .row()
    .text("2.5K — ₱3,200", "phb:2500")
    .text("3K — ₱4,300", "phb:3000")
    .row()
    .text("↩ BACK", "order");
}

/* =========================
   FOREIGN / PHB SELECTION
========================= */

bot.callbackQuery(/^(foreign|phb):(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const [, type, followers] = ctx.match;

  const price = PRICES[type][followers];

  const s = sessions.get(ctx.from.id) || {};

  s.category = type;
  s.followers = followers;
  s.unitPrice = price;

  sessions.set(ctx.from.id, s);

  await ctx.editMessageText(
    `
${type === "foreign" ? "✦ 2026 FOREIGN" : "✦ 2026 PHB"}

followers: ${formatFollowers(followers)}
price per account: ₱${price}

choose quantity:
`,
    {
      reply_markup: new InlineKeyboard()
        .text("1 ACCOUNT", `specialqty:${type}:1`)
        .text("2 ACCOUNTS", `specialqty:${type}:2`)
        .row()
        .text("5 ACCOUNTS", `specialqty:${type}:5`)
        .text("10 ACCOUNTS", `specialqty:${type}:10`)
        .row()
        .text("↩ BACK", type === "foreign" ? "cat:foreign" : "cat:phb"),
    }
  );
});

/* =========================
   QUANTITY
========================= */

bot.callbackQuery(/^qty:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const [, category, qtyText] = ctx.match;
  const qty = Number(qtyText);

  const s = sessions.get(ctx.from.id) || {};

  s.category = category;
  s.quantity = qty;
  s.unitPrice = qty >= 10
    ? PRICES[category].bulk
    : PRICES[category].single;

  s.total = s.unitPrice * qty;

  sessions.set(ctx.from.id, s);

  await chooseNiche(ctx);
});

bot.callbackQuery(/^oldqty:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const qty = Number(ctx.match[1]);

  const s = sessions.get(ctx.from.id) || {};

  s.quantity = qty;
  s.unitPrice = s.price;
  s.total = s.price * qty;

  sessions.set(ctx.from.id, s);

  await chooseNiche(ctx);
});

bot.callbackQuery(/^specialqty:(.+):(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const [, type, qtyText] = ctx.match;
  const qty = Number(qtyText);

  const s = sessions.get(ctx.from.id) || {};

  s.quantity = qty;
  s.unitPrice = s.unitPrice;
  s.total = s.unitPrice * qty;

  sessions.set(ctx.from.id, s);

  await chooseNiche(ctx);
});

/* =========================
   NICHE
========================= */

async function chooseNiche(ctx) {
  await ctx.editMessageText(
    `
♱ choose your niche:

this is for order identification
only.
`,
    { reply_markup: nicheMenu() }
  );
}

bot.callbackQuery(/^niche:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const niche = ctx.match[1];

  const s = sessions.get(ctx.from.id) || {};
  s.niche = niche;

  sessions.set(ctx.from.id, s);

  await showSummary(ctx);
});

/* =========================
   SUMMARY
========================= */

async function showSummary(ctx) {
  const s = sessions.get(ctx.from.id);

  await ctx.editMessageText(
    `
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
        ORDER SUMMARY
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

category : ${categoryName(s)}
niche : ${s.niche}
quantity : ${s.quantity}
${s.followers ? `followers : ${formatFollowers(s.followers)}\n` : ""}
price/account : ₱${s.unitPrice}

━━━━━━━━━━━━━━
TOTAL : ₱${s.total}
━━━━━━━━━━━━━━

please make sure the amount
you send is exactly:

₱${s.total}

then send your payment receipt.
`,
    {
      reply_markup: new InlineKeyboard()
        .text("💳 PAYMENT QR", "payment")
        .row()
        .text("📸 SEND RECEIPT", "receipt")
        .row()
        .text("❌ CANCEL ORDER", "home"),
    }
  );
}

/* =========================
   RECEIPT INSTRUCTION
========================= */

bot.callbackQuery("receipt", async (ctx) => {
  await ctx.answerCallbackQuery();

  const s = sessions.get(ctx.from.id);

  if (!s?.total) {
    await ctx.reply("Please create an order first. ♡");
    return;
  }

  s.waitingReceipt = true;
  sessions.set(ctx.from.id, s);

  await ctx.reply(
    `
📸 SEND PAYMENT RECEIPT

please send your payment
receipt as a photo.

amount to pay:
₱${s.total}

your receipt will be sent to
the owner for verification.

please wait for confirmation.
`
  );
});

/* =========================
   RECEIPT PHOTO
========================= */

bot.on("message:photo", async (ctx) => {
  const s = sessions.get(ctx.from.id);

  if (!s?.waitingReceipt) {
    await ctx.reply(
      "Please start an order first using /start. ♡"
    );
    return;
  }

  const photo = ctx.message.photo.at(-1);

  const orderId =
    "YV-" +
    Date.now().toString(36).toUpperCase();

  const order = {
    id: orderId,
    userId: ctx.from.id,
    username: ctx.from.username || "no username",
    firstName: ctx.from.first_name || "",
    category: categoryName(s),
    niche: s.niche,
    quantity: s.quantity,
    followers: s.followers || null,
    unitPrice: s.unitPrice,
    total: s.total,
    receiptFileId: photo.file_id,
    status: "PENDING",
    createdAt: new Date().toISOString(),
  };

  orders.set(orderId, order);

  s.waitingReceipt = false;
  s.orderId = orderId;
  sessions.set(ctx.from.id, s);

  await ctx.reply(
    `
♡ RECEIPT RECEIVED

order : ${orderId}
total : ₱${order.total}

your receipt has been forwarded
to the owner for verification.

please wait for confirmation.
`
  );

  const ownerKeyboard = new InlineKeyboard()
    .text("✓ CONFIRM PAYMENT", `confirm:${orderId}`)
    .row()
    .text("✕ FAIL / REJECT", `fail:${orderId}`);

  await bot.api.sendPhoto(
    OWNER_ID,
    photo.file_id,
    {
      caption: `
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙
          NEW ORDER
‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙

ORDER : ${orderId}

USER : ${order.firstName}
USERNAME : @${order.username}

CATEGORY : ${order.category}
NICHE : ${order.niche}
QUANTITY : ${order.quantity}
${order.followers ? `FOLLOWERS : ${formatFollowers(order.followers)}\n` : ""}
UNIT PRICE : ₱${order.unitPrice}

TOTAL ORDER : ₱${order.total}

⚠️ VERIFY THE RECEIPT
AND ACTUAL PAYMENT BEFORE
CONFIRMING.

Do not rely on the receipt image alone.
`,
      reply_markup: ownerKeyboard,
    }
  );
});

/* =========================
   OWNER CONFIRM
========================= */

bot.callbackQuery(/^confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (ctx.from.id !== OWNER_ID) {
    await ctx.reply("Only the owner can confirm orders.");
    return;
  }

  const orderId = ctx.match[1];
  const order = orders.get(orderId);

  if (!order) {
    await ctx.reply("Order not found.");
    return;
  }

  if (order.status !== "PENDING") {
    await ctx.reply(`This order is already ${order.status}.`);
    return;
  }

  order.status = "CONFIRMED";
  orders.set(orderId, order);

  await bot.api.sendMessage(
    order.userId,
    `
✓ PAYMENT CONFIRMED

order : ${orderId}
amount : ₱${order.total}

your payment has been verified.

to receive your account details,
please contact:

@yvaines_tg

thank you for your purchase ♡
`,
    {
      reply_markup: new InlineKeyboard()
        .url("📩 CONTACT @yvaines_tg", CONTACT)
        .row()
        .text("♡ HOME", "home"),
    }
  );

  await ctx.editMessageCaption({
    caption:
      ctx.callbackQuery.message.caption +
      `\n\n✓ CONFIRMED BY OWNER`,
  });
});

/* =========================
   OWNER FAIL
========================= */

bot.callbackQuery(/^fail:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  if (ctx.from.id !== OWNER_ID) {
    await ctx.reply("Only the owner can reject orders.");
    return;
  }

  const orderId = ctx.match[1];
  const order = orders.get(orderId);

  if (!order) {
    await ctx.reply("Order not found.");
    return;
  }

  if (order.status !== "PENDING") {
    await ctx.reply(`This order is already ${order.status}.`);
    return;
  }

  order.status = "FAILED";
  orders.set(orderId, order);

  await bot.api.sendMessage(
    order.userId,
    `
✕ PAYMENT NOT CONFIRMED

order : ${orderId}

we could not verify the payment
for this order.

please send the correct amount
and a valid payment receipt to
make the purchase.

required amount:
₱${order.total}

once payment is completed,
please submit your receipt again.

♡ no account will be released
until payment is verified.
`,
    {
      reply_markup: new InlineKeyboard()
        .text("💳 PAY AGAIN", "payment")
        .row()
        .text("📸 SEND NEW RECEIPT", "receipt")
        .row()
        .text("↩ HOME", "home"),
    }
  );

  await ctx.editMessageCaption({
    caption:
      ctx.callbackQuery.message.caption +
      `\n\n✕ FAILED / REJECTED BY OWNER`,
  });
});

/* =========================
   MY ORDER
========================= */

bot.callbackQuery("myorder", async (ctx) => {
  await ctx.answerCallbackQuery();

  const s = sessions.get(ctx.from.id);

  if (!s?.orderId) {
    await ctx.editMessageText(
      `
📋 MY ORDER

no current order found.

please place an order first.
`,
      {
        reply_markup: new InlineKeyboard()
          .text("🛒 ORDER NOW", "order")
          .row()
          .text("↩ BACK", "home"),
      }
    );

    return;
  }

  const order = orders.get(s.orderId);

  if (!order) {
    await ctx.reply("No order information found.");
    return;
  }

  await ctx.editMessageText(
    `
📋 MY ORDER

order : ${order.id}
category : ${order.category}
niche : ${order.niche}
quantity : ${order.quantity}
total : ₱${order.total}

status : ${order.status}
`,
    {
      reply_markup: new InlineKeyboard()
        .text("↩ BACK", "home"),
    }
  );
});

/* =========================
   TEXT
========================= */

bot.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  if (text.startsWith("/")) return;

  const s = sessions.get(ctx.from.id);

  if (s?.waitingReceipt) {
    await ctx.reply(
      `
please send your payment receipt
as a photo, not as text. ♡

required amount:
₱${s.total}
`
    );

    return;
  }

  await ctx.reply(
    "please use the navigation buttons below. ♡",
    { reply_markup: mainMenu() }
  );
});

/* =========================
   HELPERS
========================= */

function categoryName(s) {
  if (s.category === "new") return "NEW PRICING";
  if (s.category === "noNew") return "NO NEW PRICING";
  if (s.category === "yearOld") return "YEAR OLD";
  if (s.category === "foreign") return "2026 FOREIGN";
  if (s.category === "phb") return "2026 PHB";

  return s.category || "UNKNOWN";
}

function formatFollowers(value) {
  const n = Number(value);

  if (n >= 1000) {
    const k = n / 1000;
    return Number.isInteger(k)
      ? `${k}K`
      : `${k.toFixed(1)}K`;
  }

  return String(n);
}

export const POST = webhookCallback(bot, "std/http");

export const runtime = "nodejs";
