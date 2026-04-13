require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const { RETAILCRM_API_URL, RETAILCRM_API_KEY } = process.env;

if (!RETAILCRM_API_URL || !RETAILCRM_API_KEY) {
  console.error('[ERROR] Missing RETAILCRM_API_URL or RETAILCRM_API_KEY in .env');
  process.exit(1);
}

const BASE_URL = RETAILCRM_API_URL.replace(/\/$/, '');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function calcTotal(items = []) {
  return items.reduce((sum, item) => sum + item.quantity * item.initialPrice, 0);
}

async function uploadOrder(order, index, total) {
  const summ = calcTotal(order.items);
  const number = `ORD-${String(index).padStart(3, '0')}`;
  const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // RetailCRM API requires `order` as a JSON string, not nested form-fields
  const orderPayload = {
    number,
    createdAt,
    status: order.status || 'new',
    summ,
    firstName: order.firstName || '',
    lastName: order.lastName || '',
    email: order.email || '',
    phone: order.phone || '',
  };

  const body = new URLSearchParams();
  body.append('order', JSON.stringify(orderPayload));

  try {
    const response = await axios.post(
      `${BASE_URL}/api/v5/orders/create?apiKey=${RETAILCRM_API_KEY}`,
      body.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (response.data.success) {
      console.log(
        `[${index}/${total}] ✅  ${number} — ${order.firstName} ${order.lastName} — ${summ} ₸  (crm id: ${response.data.id})`
      );
    } else {
      const errors = response.data.errors
        ? Object.values(response.data.errors).join(', ')
        : response.data.errorMsg || 'Unknown error';
      console.error(`[${index}/${total}] ❌  ${number} failed: ${errors}`);
    }
  } catch (err) {
    const errMsg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`[${index}/${total}] ❌  ${number} request error: ${errMsg}`);
  }
}

async function main() {
  const ordersPath = path.resolve(__dirname, '../mock_orders.json');

  if (!fs.existsSync(ordersPath)) {
    console.error('[ERROR] mock_orders.json not found at:', ordersPath);
    process.exit(1);
  }

  const orders = JSON.parse(fs.readFileSync(ordersPath, 'utf8'));
  console.log(`[INFO] Loaded ${orders.length} orders from mock_orders.json`);
  console.log(`[INFO] Uploading to RetailCRM: ${BASE_URL}\n`);

  for (let i = 0; i < orders.length; i++) {
    await uploadOrder(orders[i], i + 1, orders.length);
    if (i < orders.length - 1) await sleep(300);
  }

  console.log('\n✅ Upload complete.');
}

main();
