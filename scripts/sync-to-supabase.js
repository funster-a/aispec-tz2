require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const { RETAILCRM_API_URL, RETAILCRM_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!RETAILCRM_API_URL || !RETAILCRM_API_KEY) {
  console.error('[ERROR] Missing RETAILCRM_API_URL or RETAILCRM_API_KEY in .env');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[ERROR] Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const BASE_URL = RETAILCRM_API_URL.replace(/\/$/, '');

async function fetchAllOrders() {
  const allOrders = [];
  let page = 1;
  const limit = 100;

  while (true) {
    console.log(`[INFO] Fetching page ${page} from RetailCRM...`);

    const response = await axios.get(`${BASE_URL}/api/v5/orders`, {
      params: { apiKey: RETAILCRM_API_KEY, limit, page },
    });

    if (!response.data.success) {
      const errors = response.data.errors ? Object.values(response.data.errors).join(', ') : 'Unknown error';
      throw new Error(`RetailCRM error: ${errors}`);
    }

    const orders = response.data.orders || [];
    allOrders.push(...orders);

    const pagination = response.data.pagination;
    if (!pagination || page >= pagination.totalPageCount) break;
    page++;
  }

  return allOrders;
}

function mapOrder(order) {
  return {
    retailcrm_id: String(order.id),
    number: order.number || null,
    created_at: order.createdAt || null,
    status: order.status || null,
    total: order.totalSumm != null ? order.totalSumm : (order.summ ?? null),
    first_name: order.firstName || null,
    last_name: order.lastName || null,
    email: order.email || null,
    phone: order.phone || null,
    synced_at: new Date().toISOString(),
  };
}

async function syncToSupabase(orders) {
  let synced = 0;
  let failed = 0;

  // Upsert in batches of 50
  const BATCH = 50;
  for (let i = 0; i < orders.length; i += BATCH) {
    const batch = orders.slice(i, i + BATCH).map(mapOrder);

    const { error } = await supabase
      .from('orders')
      .upsert(batch, { onConflict: 'retailcrm_id' });

    if (error) {
      console.error(`[ERROR] Batch ${Math.floor(i / BATCH) + 1} upsert failed:`, error.message);
      failed += batch.length;
    } else {
      synced += batch.length;
      console.log(`[INFO] Batch ${Math.floor(i / BATCH) + 1}: ${batch.length} orders upserted.`);
    }
  }

  return { synced, failed };
}

async function main() {
  console.log('[INFO] Starting RetailCRM → Supabase sync...\n');

  try {
    const orders = await fetchAllOrders();
    console.log(`[INFO] Fetched ${orders.length} total orders from RetailCRM.\n`);

    if (orders.length === 0) {
      console.log('[INFO] No orders to sync. Exiting.');
      return;
    }

    const { synced, failed } = await syncToSupabase(orders);

    console.log('\n=============================');
    console.log(`[DONE] Sync complete.`);
    console.log(`       ✅ Synced : ${synced}`);
    console.log(`       ❌ Failed : ${failed}`);
    console.log('=============================');
  } catch (err) {
    console.error('[FATAL]', err.message);
    process.exit(1);
  }
}

main();
