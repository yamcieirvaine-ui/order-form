import { Bot, webhookCallback, InlineKeyboard } from "grammy";
import {
  get, set, del, incr, listSet, addSet, removeSet, persistent
} from "../../../lib/store.js";

const token = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;

if (!token) throw new Error("BOT_TOKEN is missing");
if (!OWNER_ID) throw new Error("OWNER_ID is missing");

const bot = new Bot(token);
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://order-form-nagl.vercel.app";
const PAYMENT_QR = `${BASE_URL}/payment-qr.jpg`;
const START_IMAGE = `${BASE_URL}/start-image.jpg`;
const CONTACT = "https://t.me/yvaines_tg";

const ADMIN_IDS = new Set(
  String(process.env.ADMIN_IDS || OWNER_ID).split(",").map(x => x.trim()).filter(Boolean)
);

const PAYMENT_METHODS = {
  gcash: { name: "𝙂𝘾𝘼𝙎𝙃", account: "𝙒𝙞𝙡𝙡𝙞𝙚 𝙍𝙚𝙦𝙪𝙞𝙧𝙤𝙣" },
  maya: { name: "𝙈𝘼𝙔𝘼", account: process.env.MAYA_ACCOUNT || "Set MAYA_ACCOUNT" }
};

const PAYMENT_TIMEOUT = 15 * 60 * 1000;

function money(amount) {
  return `₱${Number(amount || 0).toLocaleString("en-PH")}`;
}

function isAdmin(id) {
  return ADMIN_IDS.has(String(id));
}

function userName(ctx) {
  return ctx.from.username
    ? `@${ctx.from.username}`
    : ctx.from.first_name || "Customer";
}

function orderId() {
  return `YF-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 90 + 10)}`;
}

async function getUser(id) {
  const key = `yf:user:${id}`;

  return await get(key, {
    id,
    username: "",
    firstName: "",
    banned: false,
    points: 0,
    favorites: [],
    watching: [],
    reviews: [],
    tickets: []
  });
}

async function saveUser(u) {
  await set(`yf:user:${u.id}`, u);
  await addSet("yf:users:index", u.id);
  return u;
}

async function getOrder(id) {
  return get(`yf:order:${id}`);
}

async function saveOrder(o) {
  await set(`yf:order:${o.id}`, o);
  await addSet("yf:orders:index", o.id);
  return o;
}

async function getProduct(id) {
  return get(`yf:product:${id}`);
}

async function saveProduct(p) {
  await set(`yf:product:${p.id}`, p);
  await addSet("yf:products:index", p.id);
  return p;
}

async function seedProducts() {
  if ((await listSet("yf:products:index")).length) return;

  const seed = [
    ["NEW-100", "100 followers — New Pricing", 90, 999, "NEW PRICING"],
    ["NONEW-100", "100 followers — No New Pricing", 120, 999, "NO NEW PRICING"],
    ["OLD-2022", "Year Old 2022–2024", 350, 999, "YEAR OLD"],
    ["OLD-2015", "Year Old 2015–2019", 550, 999, "YEAR OLD"],

    ...foreignPrices.map(([size, price]) => [
      `FOREIGN-${size.replace(/[^0-9A-Z]/gi, "")}`,
      `${size} followers — 2026 Foreign`,
      price,
      999,
      "2026 FOREIGN"
    ]),

    ...phbPrices.map(([size, price]) => [
      `PHB-${size.replace(/[^0-9A-Z]/gi, "")}`,
      `${size} followers — 2026 PHB`,
      price,
      999,
      "2026 PHB"
    ])
  ];

  for (const [id, name, price, stock, category] of seed) {
    await saveProduct({
      id,
      name,
      price,
      stock,
      category,
      description: "Available for order. Please verify the listing details before checkout."
    });
  }
}

async function listProducts() {
  await seedProducts();

  const ids = await listSet("yf:products:index");
  const out = [];

  for (const id of ids) {
    const p = await getProduct(id);
    if (p) out.push(p);
  }

  return out.sort((a, b) =>
    String(a.name).localeCompare(String(b.name))
  );
}

async function listOrders() {
  const ids = await listSet("yf:orders:index");
  const out = [];

  for (const id of ids) {
    const o = await getOrder(id);
    if (o) out.push(o);
  }

  return out.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
}

const sessions =
  globalThis.__yvaineSessions ||
  (globalThis.__yvaineSessions = new Map());

function session(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      step: "home",
      cart: [],
      draft: {}
    });
  }

  return sessions.get(id);
}

function clearSession(id) {
  sessions.delete(id);
}

function header(title) {
  return `༒︎☠︎︎ ⋆₊ ♱𓋹⛧♱ ₊⋆ ☠︎︎༒︎

♱ 𝐘𝐕𝐀𝐈𝐍𝐄𝐋𝐘 𝐅𝐋𝐄𝐔𝐑 ♱

${title}`;
}

function mainMenu(admin = false) {
  const k = new InlineKeyboard()
    .text("♱ 𝙎𝙃𝙊𝙋", "shop")
    .text("🔎 𝙎𝙀𝘼𝙍𝘾𝙃", "search")
    .row()

    .text("🛒 𝘾𝘼𝙍𝙏", "cart")
    .row()

    .text("📦 𝙈𝙔 𝙊𝙍𝘿𝙀𝙍𝙎", "orders")
    .text("💎 𝙈𝙔 𝙋𝙊𝙄𝙉𝙏𝙎", "points")
    .row()

    .text("📨 𝙎𝙐𝙋𝙋𝙊𝙍𝙏", "support")
    .row()

    .text("☾ 𝙋𝙍𝙄𝘾𝙄𝙉𝙂", "pricing")
    .text("༒ 𝙋𝘼𝙔𝙈𝙀𝙉𝙏", "payment")
    .row()

    .text("✦ 𝙌𝙐𝙄𝘾𝙆 𝙌𝙐𝙀𝙎𝙏𝙄𝙊𝙉𝙎", "faq")
    .row()

    .text("☠ 𝘾𝙊𝙉𝙏𝘼𝘾𝙏", "contact");

  if (admin) {
    k.row().text("♰ 𝘼𝘿𝙈𝙄𝙉 𝙋𝘼𝙉𝙀𝙇", "admin");
  }

  return k;
}

const FAQ = [
  [
    "WHAT IS THE PROCESS?",
    "hello! ♡ simply choose the service you need, review the available details and pricing, then send your order information. once your order is confirmed, you’ll receive updates regarding its progress. please make sure all details you provide are correct before submitting."
  ],
  [
    "RULES & REGULATIONS",
    "before placing an order, please read our rules and regulations carefully. by proceeding with an order, you acknowledge and agree to our policies regarding payment, processing, replacement, cancellation, and after-sales assistance."
  ],
  [
    "FOREIGN PRICES",
    "foreign-based options have different pricing depending on the available type and specifications. please check the current price list or message the bot for the available options."
  ],
  [
    "PH-BASED PRICES",
    "ph-based options are priced separately from foreign-based options. prices may vary depending on availability and specifications. kindly check the current price list before ordering."
  ],
  [
    "TELEGRAM",
    "you can contact us and receive order-related updates through our official telegram channel/account. please make sure you’re communicating with the correct account to avoid impersonators or scams."
  ],
  [
    "WHAT IS THE DIFFERENCE BETWEEN FOREIGN AND PH-BASED ACCOUNTS?",
    "the main difference is the account’s original region or registration location. availability, features, pricing, and other details may vary depending on the account type."
  ],
  [
    "WHAT IS THE DATE CREATION?",
    "date creation refers to the approximate date when an account was originally created. if this information is available for the option you’re interested in, it will be provided before confirmation."
  ],
  [
    "IS THIS LEGIT?",
    "yes! ♡ we aim to provide transparent information, clear procedures, and proper assistance throughout your order. you may also check our available feedbacks/vouches and official channels before proceeding."
  ],
  [
    "HOW DO I PLACE AN ORDER?",
    "choose the service you want from the menu, follow the instructions provided by the bot, and submit the required details. please wait for confirmation before considering your order finalized."
  ],
  [
    "HOW LONG DOES PROCESSING TAKE?",
    "processing time depends on the service and current queue. some orders may be completed quickly, while others may require additional time. the bot or support team will provide updates whenever there is progress."
  ],
  [
    "CAN I ASK FOR AVAILABLE OPTIONS FIRST?",
    "of course! ♡ you can check the available options and their corresponding prices before deciding. please don’t send payment until you’ve confirmed that the selected option is available."
  ],
  [
    "DO YOU ACCEPT RESELLERS?",
    "yes, reseller inquiries are welcome. ♡ kindly ask for the current reseller terms and pricing before placing an order."
  ],
  [
    "WHAT PAYMENT METHODS ARE ACCEPTED?",
    "available payment methods will be shown by the bot or provided by our official support. always verify the payment details before sending any payment."
  ],
  [
    "CAN I CANCEL MY ORDER?",
    "cancellation depends on the current status of your order. once processing has started, cancellation may no longer be possible. please confirm your order carefully before proceeding."
  ],
  [
    "DO YOU OFFER AFTER-SALES SUPPORT?",
    "yes! ♡ if you encounter an issue related to your order, contact our official support and provide your order details so we can properly check and assist you."
  ],
  [
    "WHERE CAN I SEE MY ORDER STATUS?",
    "you can check your order status through the order-tracking option available in the bot. keep your order number/reference safe until your transaction is completely finished."
  ],
  [
    "WHAT IF I ENTERED THE WRONG INFORMATION?",
    "contact support immediately after noticing the mistake. corrections may only be possible before the order enters processing, so always double-check your details before submitting."
  ],
  [
    "HOW CAN I CONTACT SUPPORT?",
    "use the CONTACT SUPPORT button in the bot and send your concern together with your order number or relevant details. please avoid sending multiple messages repeatedly, as this may make it harder to track your concern."
  ],
  [
    "WHERE CAN I SEE YOUR FEEDBACKS?",
    "you can view our available feedbacks/vouches through our official channel or feedback section. always verify that the account or channel is our official one."
  ],
  [
    "I HAVE MORE QUESTIONS.",
    "no worries! ♡ if your question isn’t listed here, select CONTACT SUPPORT and send your concern. our support team will assist you as soon as possible."
  ]
];

function faqMenu() {
  const k = new InlineKeyboard();

  FAQ.forEach(([q], i) => {
    k.text(`${i + 1}. ${q}`, `faq:${i}`).row();
  });

  k.text("༒ 𝙃𝙊𝙈𝙀", "home");

  return k;
}

function homeKeyboard(id) {
  return mainMenu(isAdmin(id));
}

function backHome(id) {
  return new InlineKeyboard()
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
  ["20K", 9700]
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
  ["3K", 4300]
];

function pricingText() {
  return `${header("𝐏𝐑𝐈𝐂𝐈𝐍𝐆")}

༒ 𝙉𝙀𝙒 𝙋𝙍𝙄𝘾𝙄𝙉𝙂
• 100 followers — ₱90
• 10+ accounts — ₱70/account

☠︎︎ 𝙉𝙊 𝙉𝙀𝙒 𝙋𝙍𝙄𝘾𝙄𝙉𝙂
• 100 followers — ₱120
• 10+ accounts — ₱90/account

𓋹 𝙔𝙀𝘼𝙍 𝙊𝙇𝘿
• 2022–2024 — ₱350
• 2015–2019 — ₱550

♱ 𝟮𝟬𝟮𝟲 𝙁𝙊𝙍𝙀𝙄𝙂𝙉
${foreignPrices.map(([s, p]) => `• ${s} — ${money(p)}`).join("\n")}

♱ 𝟮𝟬𝟮𝟲 𝙋𝙃𝘽
${phbPrices.map(([s, p]) => `• ${s} — ${money(p)}`).join("\n")}

☠︎︎ 𝙔𝙀𝘼𝙍 𝙊𝙇𝘿 𝘼𝘿𝘿-𝙊𝙉
For Foreign / PHB: + ₱350 per account`;
}

function paymentText() {
  return `${header("𝐌𝐎𝐃𝐄 𝐎𝐅 𝐏𝐀𝐘𝐌𝐄𝐍𝐓")}

💳 GCash — ${PAYMENT_METHODS.gcash.account}
💳 Maya — ${PAYMENT_METHODS.maya.account}

Payment is manually verified. A receipt does not automatically mean approval.`;
}

const startCaption = `${header("𝐎𝐑𝐃𝐄𝐑 𝐒𝐄𝐂𝐓𝐈𝐎𝐍")}

ᴛʜɪꜱ ʙᴏᴛ ɪꜱ ᴅᴇᴅɪᴄᴀᴛᴇᴅ ᴛᴏ ʏᴏᴜʀ ᴏʀᴅᴇʀ ʀᴇQᴜᴇꜱᴛꜱ.

ᴘʀᴏᴅᴜᴄᴛꜱ • ᴏʀᴅᴇʀꜱ • ᴘᴀʏᴍᴇɴᴛ • ꜱᴜᴘᴘᴏʀᴛ

Choose an option below. ⛧`;

async function ensureUser(ctx) {
  const u = await getUser(ctx.from.id);

  u.username = ctx.from.username || u.username;
  u.firstName = ctx.from.first_name || u.firstName;

  await saveUser(u);

  return u;
}

async function sendStart(ctx) {
  const u = await ensureUser(ctx);

  if (u.banned) {
    return ctx.reply("☠︎︎ Your access to this bot has been restricted.");
  }

  clearSession(ctx.from.id);

  try {
    await ctx.replyWithPhoto(START_IMAGE, {
      caption: startCaption,
      reply_markup: homeKeyboard(ctx.from.id)
    });
  } catch {
    await ctx.reply(startCaption, {
      reply_markup: homeKeyboard(ctx.from.id)
    });
  }
}

bot.command("start", sendStart);

bot.command("cancel", async ctx => {
  clearSession(ctx.from.id);

  await ctx.reply(
    "༒ 𝙊𝙧𝙙𝙚𝙧 𝙘𝙖𝙣𝙘𝙚𝙡𝙡𝙚𝙙.",
    { reply_markup: homeKeyboard(ctx.from.id) }
  );
});

bot.command("admin", async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.reply("☠ Admin only.");
  }

  await ctx.reply(
    adminText(await listOrders(), await listProducts()),
    { reply_markup: adminMenu() }
  );
});

bot.use(async (ctx, next) => {
  if (!ctx.from) return next();

  const u = await getUser(ctx.from.id);

  if (u.banned && !isAdmin(ctx.from.id)) {
    return ctx.reply(
      "☠︎︎ Your access to this bot has been restricted."
    );
  }

  return next();
});

function adminMenu() {
  return new InlineKeyboard()
    .text("📊 𝘿𝘼𝙎𝙃𝘽𝙊𝘼𝙍𝘿", "admin_dash")
    .text("🧾 𝙊𝙍𝘿𝙀𝙍𝙎", "admin_orders")
    .row()

    .text("📦 𝙋𝙍𝙊𝘿𝙐𝘾𝙏𝙎", "admin_products")
    .text("👥 𝘾𝙐𝙎𝙏𝙊𝙈𝙀𝙍𝙎", "admin_customers")
    .row()

    .text("📢 𝘽𝙍𝙊𝘼𝘿𝘾𝘼𝙎𝙏", "admin_broadcast")
    .text("📈 𝘼𝙉𝘼𝙇𝙔𝙏𝙄𝘾𝙎", "admin_analytics")
    .row()

    .text("🚫 𝘽𝘼𝙉 / 𝙐𝙉𝘽𝘼𝙉", "admin_ban")
    .row()

    .text("༒ 𝙃𝙊𝙈𝙀", "home");
}

function adminText(orders, products) {
  const revenue = orders
    .filter(o =>
      ["paid", "processing", "completed"].includes(o.status)
    )
    .reduce((s, o) => s + Number(o.total || 0), 0);

  return `${header("𝐀𝐃𝐌𝐈𝐍 𝐃𝐀𝐒𝐇𝐁𝐎𝐀𝐑𝐃")}

💰 Today's/recorded revenue: ${money(revenue)}
🧾 Total orders: ${orders.length}
⌛ Pending: ${orders.filter(o =>
    !["completed", "cancelled", "payment_failed"].includes(o.status)
  ).length}
📦 Available stock: ${products.reduce(
    (s, p) => s + Number(p.stock || 0),
    0
  )}
🛍 Products: ${products.length}

Storage: ${
    persistent
      ? "PERSISTENT REDIS"
      : "TEMPORARY MEMORY — add KV_REST_API_URL + KV_REST_API_TOKEN"
  }`;
}

async function productCatalog(category = null, query = null) {
  let products = await listProducts();

  if (category) {
    products = products.filter(
      p =>
        String(p.category).toLowerCase() ===
        String(category).toLowerCase()
    );
  }

  if (query) {
    const q = query.toLowerCase();

    products = products.filter(p =>
      `${p.name} ${p.category} ${p.description || ""}`
        .toLowerCase()
        .includes(q)
    );
  }

  return products;
}

function productKeyboard(products, prefix = "prod") {
  const k = new InlineKeyboard();

  products.slice(0, 30).forEach(p => {
    k.text(
      `${p.stock > 0 ? "♱" : "☠"} ${p.name} — ${money(p.price)}`,
      `${prefix}:${p.id}`
    ).row();
  });

  k.text("༒ 𝙃𝙊𝙈𝙀", "home");

  return k;
}

function productText(p) {
  return `${header(p.name)}

${p.description || "No description."}

Category: ${p.category || "General"}
Price: ${money(p.price)}
Stock: ${p.stock > 0 ? p.stock : "OUT OF STOCK"}

♡ Save to favorites or add to cart.`;
}

function productDetailKeyboard(p, user) {
  const fav = user.favorites.includes(p.id);

  const k = new InlineKeyboard()
    .text("🛒 𝘼𝘿𝘿 𝙏𝙊 𝘾𝘼𝙍𝙏", `addcart:${p.id}`)
    .row()
    .text(
      fav ? "♥ 𝙍𝙀𝙈𝙊𝙑𝙀 𝙁𝘼𝙑" : "♡ 𝙁𝘼𝙑𝙊𝙍𝙄𝙏𝙀",
      `fav:${p.id}`
    )
    .row();

  if (p.stock <= 0) {
    k.text("🔔 𝙉𝙊𝙏𝙄𝙁𝙔 𝙈𝙀", `watch:${p.id}`).row();
  }

  k.text("༒ 𝘽𝘼𝘾𝙆", "shop")
    .text("☠ 𝙃𝙊𝙈𝙀", "home");

  return k;
}

async function showProducts(ctx, products) {
  if (!products) {
    products = await productCatalog();
  }

  await ctx.reply(
    `${header("𝐏𝐑𝐎𝐃𝐔𝐂𝐓 𝐂𝐀𝐓𝐀𝐋𝐎𝐆")}

Select a product below.`,
    {
      reply_markup: productKeyboard(products)
    }
  );
}

bot.callbackQuery("shop", async ctx => {
  await ctx.answerCallbackQuery();
  await showProducts(ctx);
});

bot.callbackQuery(/^prod:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const p = await getProduct(ctx.match[1]);

  if (!p) {
    return ctx.reply("Product unavailable.");
  }

  await ctx.reply(
    productText(p),
    {
      reply_markup: productDetailKeyboard(
        p,
        await getUser(ctx.from.id)
      )
    }
  );
});

bot.callbackQuery(/^addcart:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const p = await getProduct(ctx.match[1]);

  if (!p || p.stock <= 0) {
    return ctx.reply("☠ Out of stock.");
  }

  const s = session(ctx.from.id);
  const item = s.cart.find(x => x.productId === p.id);

  if (item) {
    item.quantity++;
  } else {
    s.cart.push({
      productId: p.id,
      quantity: 1,
      price: p.price,
      name: p.name
    });
  }

  await ctx.reply(
    `🛒 Added **${p.name}** to your cart.`,
    {
      parse_mode: "Markdown",
      reply_markup: new InlineKeyboard()
        .text("🛒 VIEW CART", "cart")
        .text("♱ CONTINUE SHOPPING", "shop")
    }
  );
});

bot.callbackQuery(/^fav:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const u = await getUser(ctx.from.id);
  const id = ctx.match[1];
  const i = u.favorites.indexOf(id);

  if (i >= 0) {
    u.favorites.splice(i, 1);
  } else {
    u.favorites.push(id);
  }

  await saveUser(u);

  const p = await getProduct(id);

  if (p) {
    await ctx.editMessageText(
      productText(p),
      {
        reply_markup: productDetailKeyboard(p, u)
      }
    );
  }
});

bot.callbackQuery("favorites", async ctx => {
  await ctx.answerCallbackQuery();

  const u = await getUser(ctx.from.id);
  const ps = [];

  for (const id of u.favorites) {
    const p = await getProduct(id);

    if (p) ps.push(p);
  }

  await ctx.reply(
    `${header("𝐅𝐀𝐕𝐎𝐑𝐈𝐓𝐄𝐒")}

${ps.length ? "Your saved products:" : "No favorites yet."}`,
    {
      reply_markup: productKeyboard(ps, "prod")
    }
  );
});

bot.callbackQuery(/^watch:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const u = await getUser(ctx.from.id);
  const id = ctx.match[1];

  if (!u.watching.includes(id)) {
    u.watching.push(id);
  }

  await saveUser(u);

  await ctx.reply(
    "🔔 You'll be notified when this product is restocked."
  );
});

bot.callbackQuery("restock", async ctx => {
  await ctx.answerCallbackQuery();

  const u = await getUser(ctx.from.id);
  const ps = [];

  for (const id of u.watching) {
    const p = await getProduct(id);

    if (p) ps.push(p);
  }

  await ctx.reply(
    `${header("𝐑𝐄𝐒𝐓𝐎𝐂𝐊 𝐀𝐋𝐄𝐑𝐓𝐒")}

${
  ps.map(
    p =>
      `• ${p.name} — ${
        p.stock > 0 ? "AVAILABLE" : "WAITING"
      }`
  ).join("\n") || "No alerts saved."
}`,
    {
      reply_markup: backHome(ctx.from.id)
    }
  );
});

function cartTotal(cart) {
  return cart.reduce(
    (s, x) => s + Number(x.price) * Number(x.quantity),
    0
  );
}

function cartKeyboard(cart) {
  const k = new InlineKeyboard();

  cart.forEach(x => {
    k.text(
      `➖ ${x.name}`,
      "cartminus:" + x.productId
    )
      .text(`➕`, "cartplus:" + x.productId)
      .row();
  });

  if (cart.length) {
    k.text("💳 𝘾𝙃𝙀𝘾𝙆𝙊𝙐𝙏", "checkout")
      .row()
      .text("🗑 𝘾𝙇𝙀𝘼𝙍", "clearcart")
      .row();
  }

  return k.text("༒ 𝙃𝙊𝙈𝙀", "home");
}

async function showCart(ctx) {
  const s = session(ctx.from.id);

  const lines = s.cart
    .map(
      x =>
        `• ${x.name} × ${x.quantity} = ${money(
          x.price * x.quantity
        )}`
    )
    .join("\n");

  await ctx.reply(
    `${header("𝐌𝐘 𝐂𝐀𝐑𝐓")}

${lines || "Your cart is empty."}

TOTAL: ♱ ${money(cartTotal(s.cart))} ♱`,
    {
      reply_markup: cartKeyboard(s.cart)
    }
  );
}

bot.callbackQuery("cart", async ctx => {
  await ctx.answerCallbackQuery();
  await showCart(ctx);
});

bot.callbackQuery(/^cartplus:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const s = session(ctx.from.id);
  const p = await getProduct(ctx.match[1]);

  if (p && p.stock > 0) {
    const i = s.cart.find(
      x => x.productId === p.id
    );

    if (i) i.quantity++;
  }

  await showCart(ctx);
});

bot.callbackQuery(/^cartminus:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const s = session(ctx.from.id);

  const i = s.cart.findIndex(
    x => x.productId === ctx.match[1]
  
