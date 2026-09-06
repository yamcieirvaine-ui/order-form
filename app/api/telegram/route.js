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
    );

  if (i >= 0) {
    s.cart[i].quantity--;

    if (s.cart[i].quantity <= 0) {
      s.cart.splice(i, 1);
    }
  }

  await showCart(ctx);
});

bot.callbackQuery("clearcart", async ctx => {
  await ctx.answerCallbackQuery();

  session(ctx.from.id).cart = [];

  await showCart(ctx);
});

bot.callbackQuery("checkout", async ctx => {
  await ctx.answerCallbackQuery();

  const s = session(ctx.from.id);

  if (!s.cart.length) {
    return ctx.reply("Cart is empty.");
  }

  const products = [];

  for (const item of s.cart) {
    const p = await getProduct(item.productId);

    if (!p || p.stock < item.quantity) {
      return ctx.reply(`☠ Not enough stock for ${item.name}.`);
    }

    products.push(p);
  }

  const total = cartTotal(s.cart);
  const id = orderId();

  const o = {
    id,
    userId: ctx.from.id,
    username: ctx.from.username || "",
    items: s.cart.map(x => ({ ...x })),
    total,
    status: "pending",
    paymentMethod: null,
    receiptFileId: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT).toISOString(),
    history: [
      {
        status: "pending",
        at: new Date().toISOString()
      }
    ]
  };

  await saveOrder(o);

  s.draft = {
    orderId: id
  };

  await ctx.reply(
    `${header("𝐎𝐑𝐃𝐄𝐑 𝐑𝐄𝐂𝐄𝐈𝐏𝐓")}

🆔 Order ID: ${id}
${s.cart.map(x => `• ${x.name} × ${x.quantity}`).join("\n")}

TOTAL: ♱ ${money(total)} ♱

⏳ Payment window: 15 minutes
Choose a payment method.`,
    {
      reply_markup: new InlineKeyboard()
        .text("💳 GCASH", "paymethod:gcash")
        .text("💳 MAYA", "paymethod:maya")
        .row()
        .text("☠ CANCEL", `cancelorder:${id}`)
    }
  );
});

bot.callbackQuery(/^cancelorder:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o || o.userId !== ctx.from.id) {
    return ctx.reply("Order not found.");
  }

  if (["completed", "cancelled"].includes(o.status)) {
    return;
  }

  await updateOrderStatus(o, "cancelled");

  await ctx.reply(`☠ Order ${o.id} cancelled.`);
});

bot.callbackQuery(/^paymethod:(gcash|maya)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const method = ctx.match[1];

  const o = await getOrder(
    session(ctx.from.id).draft.orderId
  );

  if (!o) {
    return ctx.reply("Order expired.");
  }

  o.paymentMethod = method;

  await saveOrder(o);

  const m = PAYMENT_METHODS[method];

  await ctx.replyWithPhoto(PAYMENT_QR, {
    caption: `${header("𝐏𝐀𝐘𝐌𝐄𝐍𝐓")}

Order: ${o.id}
Method: ${m.name}
Account: ${m.account}
Amount: ♱ ${money(o.total)} ♱

⏳ Please pay within 15 minutes.
📸 Then send your payment receipt photo in this chat.`,
    reply_markup: new InlineKeyboard()
      .text("༒ 𝙈𝙔 𝙊𝙍𝘿𝙀𝙍", "orders")
  });
});

bot.on("message:photo", async ctx => {
  const s = session(ctx.from.id);
  const id = s.draft.orderId;

  if (!id) return;

  const o = await getOrder(id);

  if (!o || o.status === "cancelled") return;

  o.receiptFileId =
    ctx.message.photo.at(-1).file_id;

  o.status = "payment_review";

  o.history.push({
    status: o.status,
    at: new Date().toISOString()
  });

  await saveOrder(o);

  await ctx.reply(
    `${header("𝐑𝐄𝐂𝐄𝐈𝐏𝐓 𝐑𝐄𝐂𝐄𝐈𝐕𝐄𝐃")}

Order: ${o.id}
Status: ⌛ Payment review

Please wait for admin approval.`
  );

  await bot.api.sendPhoto(
    OWNER_ID,
    o.receiptFileId,
    {
      caption: `♱ 𝐍𝐄𝐖 𝐏𝐀𝐘𝐌𝐄𝐍𝐓 ♱

Order: ${o.id}
Customer: ${userName(ctx)}
Amount: ${money(o.total)}
Method: ${PAYMENT_METHODS[o.paymentMethod]?.name || "Unknown"}

Approve only after verifying the actual payment.`,
      reply_markup: new InlineKeyboard()
        .text("✅ APPROVE", `approve:${o.id}`)
        .text("❌ REJECT", `reject:${o.id}`)
        .row()
        .text("⚙️ PROCESSING", `processing:${o.id}`)
    }
  );
});

async function updateOrderStatus(o, status) {
  o.status = status;
  o.updatedAt = new Date().toISOString();
  o.history = o.history || [];

  o.history.push({
    status,
    at: o.updatedAt
  });

  await saveOrder(o);
}

bot.callbackQuery(/^approve:(.+)$/, async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o) return;

  for (const item of o.items) {
    const p = await getProduct(item.productId);

    if (!p || Number(p.stock) < Number(item.quantity)) {
      return ctx.reply(
        `☠ Cannot approve ${o.id}: insufficient stock for ${item.name}. Update stock first.`
      );
    }
  }

  for (const item of o.items) {
    const p = await getProduct(item.productId);

    p.stock =
      Number(p.stock) - Number(item.quantity);

    await saveProduct(p);
  }

  await updateOrderStatus(o, "paid");

  const u = await getUser(o.userId);

  const earned =
    Math.max(1, Math.floor(o.total / 100));

  u.points += earned;

  await saveUser(u);

  await bot.api.sendMessage(
    o.userId,
    `${header("𝐏𝐀𝐘𝐌𝐄𝐍𝐓 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐄𝐃")}

🧾 ORDER RECEIPT
🆔 ${o.id}
${o.items.map(x => `• ${x.name} × ${x.quantity}`).join("\n")}

💰 TOTAL: ${money(o.total)}
💳 ${PAYMENT_METHODS[o.paymentMethod]?.name || "Payment"}
📦 STATUS: ♱ PAID ♱

💎 Loyalty points earned: ${earned}`,
    {
      reply_markup: new InlineKeyboard()
        .text(
          "⚙️ PROCESSING",
          `customer_processing:${o.id}`
        )
        .text("📦 MY ORDERS", "orders")
    }
  );

  await ctx.editMessageCaption({
    caption:
      (ctx.callbackQuery.message.caption || "") +
      "\n\n♱ APPROVED ♱"
  });
});

bot.callbackQuery(/^reject:(.+)$/, async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o) return;

  await updateOrderStatus(
    o,
    "payment_failed"
  );

  await bot.api.sendMessage(
    o.userId,
    `☠ Payment for ${o.id} was not verified.

Please make the payment correctly and submit a new receipt.`,
    {
      reply_markup: new InlineKeyboard()
        .text("💳 𝙋𝘼𝙔 𝘼𝙂𝘼𝙄𝙉", "orders")
    }
  );

  await ctx.editMessageCaption({
    caption:
      (ctx.callbackQuery.message.caption || "") +
      "\n\n☠ REJECTED ☠"
  });
});

bot.callbackQuery(/^processing:(.+)$/, async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o) return;

  await updateOrderStatus(
    o,
    "processing"
  );

  await bot.api.sendMessage(
    o.userId,
    `⚙️ Order ${o.id} is now processing.`
  );

  await ctx.editMessageCaption({
    caption:
      (ctx.callbackQuery.message.caption || "") +
      "\n\n⚙️ PROCESSING"
  });
});

bot.callbackQuery(/^customer_processing:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o || o.userId !== ctx.from.id) return;

  await bot.api.sendMessage(
    OWNER_ID,
    `Customer ${userName(ctx)} is asking about order ${o.id}.`
  );

  await ctx.reply(
    "📨 Your request has been sent to support."
  );
});

bot.callbackQuery("orders", async ctx => {
  await ctx.answerCallbackQuery();

  const os = (await listOrders())
    .filter(o => o.userId === ctx.from.id)
    .slice(0, 20);

  const k = new InlineKeyboard();

  os.forEach(o => {
    k.text(
      `${o.id} — ${o.status} — ${money(o.total)}`,
      `vieworder:${o.id}`
    ).row();
  });

  k.text("༒ 𝙃𝙊𝙈𝙀", "home");

  await ctx.reply(
    `${header("𝐎𝐑𝐃𝐄𝐑 𝐇𝐈𝐒𝐓𝐎𝐑𝐘")}

${os.length ? "Select an order:" : "No orders yet."}`,
    {
      reply_markup: k
    }
  );
});

bot.callbackQuery(/^vieworder:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o || o.userId !== ctx.from.id) {
    return ctx.reply("Order not found.");
  }

  const countdown =
    o.expiresAt && o.status === "pending"
      ? Math.max(
          0,
          Math.floor(
            (new Date(o.expiresAt) - Date.now()) /
              1000
          )
        )
      : 0;

  await ctx.reply(
    `${header("𝐎𝐑𝐃𝐄𝐑 𝐓𝐑𝐀𝐂𝐊𝐈𝐍𝐆")}

🆔 ${o.id}

${o.items.map(x => `• ${x.name} × ${x.quantity}`).join("\n")}

TOTAL: ${money(o.total)}
💳 Payment: ${o.paymentMethod || "Not selected"}

STATUS: ♱ ${o.status.toUpperCase()} ♱
${
  countdown
    ? `⏳ Payment expires in about ${Math.ceil(countdown / 60)} minute(s).`
    : ""
}`,
    {
      reply_markup: new InlineKeyboard()
        .text("⭐ 𝙇𝙀𝘼𝙑𝙀 𝙍𝙀𝙑𝙄𝙀𝙒", `review:${o.id}`)
        .row()
        .text("📨 𝙎𝙐𝙋𝙋𝙊𝙍𝙏", "support")
        .text("༒ 𝙃𝙊𝙈𝙀", "home")
    }
  );
});

bot.callbackQuery("points", async ctx => {
  await ctx.answerCallbackQuery();

  const u = await getUser(ctx.from.id);

  await ctx.reply(
    `${header("𝐋𝐎𝐘𝐀𝐋𝐓𝐘 𝐏𝐎𝐈𝐍𝐓𝐒")}

💎 Current points: ${u.points}

You earn 1 point per ₱100 on approved payments.

Points are stored on your account.`,
    {
      reply_markup: backHome(ctx.from.id)
    }
  );
});

bot.callbackQuery("review", async ctx => {
  await ctx.answerCallbackQuery();

  await ctx.reply(
    `${header("𝐑𝐄𝐕𝐈𝐄𝐖 / 𝐕𝐎𝐔𝐂𝐇")}

Send your feedback as a message.

Example: “fast transaction, smooth order ♡”`
  );

  session(ctx.from.id).step = "review";
});

bot.callbackQuery(/^review:(.+)$/, async ctx => {
  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o || o.userId !== ctx.from.id) {
    return ctx.reply("Order not found.");
  }

  session(ctx.from.id).draft.reviewOrder = o.id;
  session(ctx.from.id).step = "review";

  await ctx.reply("⭐ Send your review/vouch now.");
});

bot.callbackQuery("support", async ctx => {
  await ctx.answerCallbackQuery();

  session(ctx.from.id).step = "support";

  await ctx.reply(
    `${header("𝐂𝐎𝐍𝐓𝐀𝐂𝐓 𝐒𝐔𝐏𝐏𝐎𝐑𝐓")}

Send your concern in one message and a support ticket will be created.`
  );
});

bot.callbackQuery("search", async ctx => {
  await ctx.answerCallbackQuery();

  session(ctx.from.id).step = "search";

  await ctx.reply(
    "🔎 Send a product name, username, category, or keyword to search."
  );
});

bot.callbackQuery("home", async ctx => {
  await ctx.answerCallbackQuery();

  try {
    await ctx.editMessageText(
      startCaption,
      {
        reply_markup: homeKeyboard(ctx.from.id)
      }
    );
  } catch {
    await ctx.reply(
      startCaption,
      {
        reply_markup: homeKeyboard(ctx.from.id)
      }
    );
  }
});

bot.callbackQuery("pricing", async ctx => {
  await ctx.answerCallbackQuery();

  await ctx.reply(
    pricingText(),
    {
      reply_markup: backHome(ctx.from.id)
    }
  );
});

bot.callbackQuery("payment", async ctx => {
  await ctx.answerCallbackQuery();

  await ctx.replyWithPhoto(
    PAYMENT_QR,
    {
      caption: paymentText(),
      reply_markup: backHome(ctx.from.id)
    }
  );
});

bot.callbackQuery("contact", async ctx => {
  await ctx.answerCallbackQuery();

  await ctx.reply(
    `${header("𝐂𝐎𝐍𝐓𝐀𝐂𝐓")}

For direct assistance:

@yvaines_tg`,
    {
      reply_markup: new InlineKeyboard()
        .url(
          "☠ 𝘾𝙊𝙉𝙏𝘼𝘾𝙏 𝙔𝙑𝘼𝙄𝙉𝙀",
          CONTACT
        )
        .row()
        .text("༒ 𝙃𝙊𝙈𝙀", "home")
    }
  );
});

bot.on("message:text", async ctx => {
  const s = session(ctx.from.id);
  const text = ctx.message.text.trim();

  if (text.startsWith("/")) return;

  if (s.step === "search") {
    s.step = "home";
    await showProducts(
      ctx,
      await productCatalog(null, text)
    );
    return;
  }

  if (s.step === "review") {
    const u = await getUser(ctx.from.id);
    const oid = s.draft.reviewOrder || null;

    u.reviews.push({
      orderId: oid,
      text,
      at: new Date().toISOString()
    });

    await saveUser(u);

    s.step = "home";

    await ctx.reply(
      "⭐ Thank you for your review/vouch ♡",
      {
        reply_markup: homeKeyboard(ctx.from.id)
      }
    );

    return;
  }

  if (s.step === "support") {
    const ticket = {
      id: `T-${Date.now().toString(36).toUpperCase()}`,
      userId: ctx.from.id,
      username: userName(ctx),
      text,
      status: "open",
      createdAt: new Date().toISOString()
    };

    await set(
      `yf:ticket:${ticket.id}`,
      ticket
    );

    await addSet(
      "yf:tickets:index",
      ticket.id
    );

    await bot.api.sendMessage(
      OWNER_ID,
      `📨 NEW SUPPORT TICKET

${ticket.id}
Customer: ${ticket.username}

${text}`,
      {
        reply_markup: new InlineKeyboard()
          .text(
            "☠ CONTACT CUSTOMER",
            `supportuser:${ctx.from.id}`
          )
      }
    );

    s.step = "home";

    await ctx.reply(
      `📨 Ticket ${ticket.id} created.

Support has been notified.`,
      {
        reply_markup: homeKeyboard(ctx.from.id)
      }
    );

    return;
  }
});

bot.callbackQuery("admin", async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  await ctx.reply(
    adminText(
      await listOrders(),
      await listProducts()
    ),
    {
      reply_markup: adminMenu()
    }
  );
});

bot.callbackQuery("admin_dash", async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  await ctx.reply(
    adminText(
      await listOrders(),
      await listProducts()
    ),
    {
      reply_markup: adminMenu()
    }
  );
});

bot.callbackQuery("admin_orders", async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const os = await listOrders();
  const k = new InlineKeyboard();

  os.slice(0, 25).forEach(o => {
    k.text(
      `${o.id} • ${o.status}`,
      `adminorder:${o.id}`
    ).row();
  });

  k.text("༒ 𝙃𝙊𝙈𝙀", "home");

  await ctx.reply(
    `${header("𝐎𝐑𝐃𝐄𝐑 𝐌𝐀𝐍𝐀𝐆𝐄𝐑")}

Select an order.`,
    {
      reply_markup: k
    }
  );
});

bot.callbackQuery(/^adminorder:(.+)$/, async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o) return;

  await ctx.reply(
    `${header(o.id)}

Customer: ${o.username || o.userId}
${o.items.map(x => `• ${x.name} × ${x.quantity}`).join("\n")}

Total: ${money(o.total)}
Status: ${o.status}`,
    {
      reply_markup: new InlineKeyboard()
        .text("⚙️ PROCESSING", `processing:${o.id}`)
        .text("✓ COMPLETE", `complete:${o.id}`)
        .row()
        .text("❌ CANCEL", `admincancel:${o.id}`)
        .row()
    }
  );
});

bot.callbackQuery(/^complete:(.+)$/, async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o) return;

  await updateOrderStatus(
    o,
    "completed"
  );

  await bot.api.sendMessage(
    o.userId,
    `♱ 𝐎𝐑𝐃𝐄𝐑 𝐂𝐎𝐌𝐏𝐋𝐄𝐓𝐄𝐃 ♱

${o.id}
Your order has been completed. Thank you ♡`
  );

  await ctx.reply(
    "✓ Marked completed."
  );
});

bot.callbackQuery(/^admincancel:(.+)$/, async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const o = await getOrder(ctx.match[1]);

  if (!o) return;

  await updateOrderStatus(
    o,
    "cancelled"
  );

  await ctx.reply(
    "Order cancelled."
  );
});

bot.callbackQuery("admin_products", async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const ps = await listProducts();

  await ctx.reply(
    `${header("𝐏𝐑𝐎𝐃𝐔𝐂𝐓 / 𝐒𝐓𝐎𝐂𝐊 𝐌𝐀𝐍𝐀𝐆𝐄𝐑")}

${ps.map(p =>
  `• ${p.name} — ${money(p.price)} — stock ${p.stock}`
).join("\n") || "No products yet."}

Use /addproduct to add one.`,
    {
      reply_markup: adminMenu()
    }
  );
});

bot.callbackQuery("admin_customers", async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const ids = await listSet("yf:users:index");
  const users = [];

  for (const id of ids) {
    const u = await getUser(id);

    if (u) users.push(u);
  }

  await ctx.reply(
    `${header("𝐂𝐔𝐒𝐓𝐎𝐌𝐄𝐑 𝐌𝐀𝐍𝐀𝐆𝐄𝐑")}

${
  users.slice(0, 30).map(u =>
    `• ${u.firstName || u.id} ${
      u.username ? "(" + u.username + ")" : ""
    } — ${u.points} pts`
  ).join("\n") || "No users recorded yet."
}`,
    {
      reply_markup: adminMenu()
    }
  );
});

bot.callbackQuery("admin_analytics", async ctx => {
  if (!isAdmin(ctx.from.id)) {
    return ctx.answerCallbackQuery({
      text: "Admin only.",
      show_alert: true
    });
  }

  await ctx.answerCallbackQuery();

  const os = await listOrders();
  const byStatus = {};

  for (const o of os) {
    byStatus[o.status] =
      (byStatus[o.status] || 0) + 1;
  }

  await ctx.reply(
    `${header("𝐒𝐀𝐋𝐄𝐒 𝐀𝐍𝐀𝐋𝐘𝐓𝐈𝐂𝐒")}

Orders: ${os.length}
Paid: ${byStatus.paid || 0}
Processing: ${byStatus.processing || 0}
Completed: ${byStatus.completed || 0}
Pending review: ${byStatus.payment_review || 0}
Revenue recorded: ${money(
  os.filter(o =>
    ["paid", "processing", "completed"]
      .includes(o.status)
  ).reduce(
    (s, o) => s + Number(o.total),
    0
  )
)}`,
    {
      reply_markup: adminMenu()
    }
  );
});

bot.command("addproduct", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "addproduct";

  await ctx.reply(
    `➕ Send product in this format:

Name | Price | Stock | Category | Description

Example:
500 followers | 890 | 10 | PHB | available account`
  );
});

bot.command("editstock", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "editstock";

  await ctx.reply(
    "📦 Send: product-id | new-stock"
  );
});

bot.command("deleteproduct", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "deleteproduct";

  await ctx.reply(
    "🗑 Send the product ID to delete."
  );
});

bot.command("editproduct", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "editproduct";

  await ctx.reply(
    "✏️ Send: product-id | name | price | stock | category | description"
  );
});

bot.command("tickets", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  const ids =
    await listSet("yf:tickets:index");

  const lines = [];

  for (const id of ids) {
    const t = await get(
      `yf:ticket:${id}`
    );

    if (t) {
      lines.push(
        `• ${t.id} — ${t.status} — ${t.username}\n${t.text}`
      );
    }
  }

  await ctx.reply(
    `${header("𝐒𝐔𝐏𝐏𝐎𝐑𝐓 𝐓𝐈𝐂𝐊𝐄𝐓𝐒")}

${lines.join("\n\n") || "No tickets."}`
  );
});

bot.command("broadcast", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "broadcast";

  await ctx.reply(
    "📢 Send the broadcast message."
  );
});

bot.command("ban", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "ban";

  await ctx.reply(
    "🚫 Send the Telegram user ID to ban."
  );
});

bot.command("unban", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "unban";

  await ctx.reply(
    "♰ Send the Telegram user ID to ban."
  );
});

bot.command("unban", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  session(ctx.from.id).step =
    "unban";

  await ctx.reply(
    "♰ Send the Telegram user ID to unban."
  );
});

bot.on("message:text", async ctx => {
  if (!isAdmin(ctx.from.id)) return;

  const s = session(ctx.from.id);
  const text = ctx.message.text.trim();

  if (s.step === "editproduct") {
    const [
      id,
      name,
      price,
      stock,
      category,
      ...desc
    ] = text.split("|").map(x => x.trim());

    const p = await getProduct(id);

    if (
      !p ||
      !name ||
      isNaN(Number(price)) ||
      isNaN(Number(stock))
    ) {
      return ctx.reply(
        "Invalid product ID or format."
      );
    }

    Object.assign(p, {
      name,
      price: Number(price),
      stock: Number(stock),
      category: category || p.category,
      description:
        desc.join(" | ") || p.description
    });

    await saveProduct(p);

    s.step = "home";

    await ctx.reply(
      `✏️ Updated ${p.name} (${p.id})`
    );

    return;
  }

  if (s.step === "addproduct") {
    const [
      name,
      price,
      stock,
      category,
      ...desc
    ] = text.split("|").map(x => x.trim());

    if (
      !name ||
      isNaN(Number(price)) ||
      isNaN(Number(stock))
    ) {
      return ctx.reply(
        "Invalid format."
      );
    }

    const p = {
      id:
        `P-${Date.now().toString(36).toUpperCase()}`,
      name,
      price: Number(price),
      stock: Number(stock),
      category:
        category || "General",
      description:
        desc.join(" | ")
    };

    await saveProduct(p);

    s.step = "home";

    await ctx.reply(
      `➕ Added ${p.name}\nID: ${p.id}`
    );

    return;
  }

  if (s.step === "editstock") {
    const [
      id,
      stock
    ] = text.split("|").map(x => x.trim());

    const p = await getProduct(id);

    if (
      !p ||
      isNaN(Number(stock))
    ) {
      return ctx.reply(
        "Product not found or invalid stock."
      );
    }

    const was = p.stock;

    p.stock =
      Math.max(0, Number(stock));

    await saveProduct(p);

    s.step = "home";

    await ctx.reply(
      `📦 ${p.name} stock: ${was} → ${p.stock}`
    );

    if (was <= 0 && p.stock > 0) {
      const ids =
        await listSet("yf:users:index");

      for (const uid of ids) {
        const u = await getUser(uid);

        if (
          u?.watching?.includes(p.id)
        ) {
          await bot.api.sendMessage(
            uid,
            `🔔 RESTOCK ALERT

${p.name} is available again!`,
            {
              reply_markup:
                new InlineKeyboard()
                  .text(
                    "🛍 VIEW PRODUCT",
                    `prod:${p.id}`
                  )
            }
          );

          u.watching =
            u.watching.filter(
              x => x !== p.id
            );

          await saveUser(u);
        }
      }
    }

    return;
  }

  if (s.step === "deleteproduct") {
    const p = await getProduct(text);

    if (!p) {
      return ctx.reply(
        "Product not found."
      );
    }

    await del(
      `yf:product:${p.id}`
    );

    await removeSet(
      "yf:products:index",
      p.id
    );

    s.step = "home";

    await ctx.reply(
      `🗑 Deleted ${p.name}`
    );

    return;
  }

  if (s.step === "broadcast") {
    const ids =
      await listSet("yf:users:index");

    let sent = 0;

    for (const uid of ids) {
      try {
        await bot.api.sendMessage(
          uid,
          text
        );

        sent++;
      } catch {}
    }

    s.step = "home";

    await ctx.reply(
      `📢 Broadcast sent to ${sent} users.`
    );

    return;
  }

  if (
    s.step === "ban" ||
    s.step === "unban"
  ) {
    const id = text;
    const u = await getUser(id);

    u.id = Number(id);
    u.banned =
      s.step === "ban";

    await saveUser(u);

    s.step = "home";

    await ctx.reply(
      `${u.banned ? "🚫 Banned" : "♰ Unbanned"} ${id}`
    );

    return;
  }
});

export async function GET(req) {
  const secret =
    process.env.CRON_SECRET;

  if (
    secret &&
    req.headers.get("authorization") !==
      `Bearer ${secret}`
  ) {
    return new Response(
      "Unauthorized",
      { status: 401 }
    );
  }

  const now = Date.now();

  const os = await listOrders();

  let expired = 0;

  for (const o of os) {
    if (
      o.status === "pending" &&
      o.expiresAt &&
      new Date(o.expiresAt).getTime() <= now
    ) {
      await updateOrderStatus(
        o,
        "cancelled"
      );

      expired++;

      try {
        await bot.api.sendMessage(
          o.userId,
          `☠ Order ${o.id} expired because payment was not received within 15 minutes.

You may create a new order anytime.`
        );
      } catch {}
    }
  }

  return Response.json({
    ok: true,
    expired,
    persistent
  });
}

export const POST =
  webhookCallback(bot, "std/http");

export const runtime = "nodejs";
