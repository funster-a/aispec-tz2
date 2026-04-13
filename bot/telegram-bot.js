require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const { RETAILCRM_API_URL, RETAILCRM_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = process.env;

if (!TELEGRAM_BOT_TOKEN) {
  console.error('[ERROR] Missing TELEGRAM_BOT_TOKEN in .env');
  process.exit(1);
}
if (!TELEGRAM_CHAT_ID) {
  console.error('[ERROR] Missing TELEGRAM_CHAT_ID in .env');
  process.exit(1);
}
if (!RETAILCRM_API_URL || !RETAILCRM_API_KEY) {
  console.error('[ERROR] Missing RETAILCRM_API_URL or RETAILCRM_API_KEY in .env');
  process.exit(1);
}

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const BASE_URL = RETAILCRM_API_URL.replace(/\/$/, '');
const notifiedOrderIds = new Set();
const POLL_INTERVAL_MS = 60_000;
const MIN_TOTAL_FOR_ALERT = 50_000;

function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function buildMessage(order) {
  return (
    `🚨 <b>Крупный заказ!</b>\n` +
    `📦 Заказ: <code>${order.number}</code>\n` +
    `💰 Сумма: <b>${Number(order.totalSumm ?? order.summ ?? 0).toLocaleString('ru-RU')} ₸</b>\n` +
    `👤 Клиент: ${order.firstName ?? ''} ${order.lastName ?? ''}\n` +
    `📅 Дата: ${formatDate(order.createdAt)}`
  );
}

async function pollNewOrders() {
  const createdAtFrom = new Date(Date.now() - POLL_INTERVAL_MS).toISOString().slice(0, 19);

  try {
    const response = await axios.get(`${BASE_URL}/api/v5/orders`, {
      params: {
        apiKey: RETAILCRM_API_KEY,
        'filter[createdAtFrom]': createdAtFrom,
        limit: 100,
      },
    });

    if (!response.data.success) {
      console.error('[ERROR] RetailCRM poll failed:', response.data.errors);
      return;
    }

    const orders = response.data.orders || [];
    console.log(`[${new Date().toISOString()}] Polled RetailCRM — ${orders.length} new order(s) in last 60s`);

    for (const order of orders) {
      const total = Number(order.totalSumm ?? order.summ ?? 0);
      const id = String(order.id);

      if (total <= MIN_TOTAL_FOR_ALERT) continue;
      if (notifiedOrderIds.has(id)) continue;

      notifiedOrderIds.add(id);

      const message = buildMessage(order);
      try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message, { parse_mode: 'HTML' });
        console.log(`[NOTIFY] Sent alert for order ${order.number} (${total} ₸)`);
      } catch (sendErr) {
        console.error(`[ERROR] Failed to send Telegram message for order ${order.number}:`, sendErr.message);
      }
    }
  } catch (err) {
    console.error('[ERROR] Poll request failed:', err.message);
  }
}

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, '👋 Order alert bot is running. Large orders (> 50 000 ₸) will be posted here automatically.');
});

bot.onText(/\/status/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `✅ Bot is online.\n🔔 Monitoring: ${BASE_URL}\n📋 Notified orders this session: ${notifiedOrderIds.size}`
  );
});

console.log('[INFO] Telegram bot started. Polling RetailCRM every 60 seconds...');

// Poll immediately on launch, then every 60 seconds
pollNewOrders();
setInterval(pollNewOrders, POLL_INTERVAL_MS);
