import { Client } from './db/client.ts';
import { Application, Router, send, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
const config = {
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  tls: {
    enabled: true,
    caCertificates: []
  }
};

const dbClient = new Client(config);

// A. 在庫更新 (POST)
async function handleInventoryUpdate(ctx: Context) {
  try {
    const body = ctx.request.body;
    const val = await body.form();

    const itemName = val.get('item_id');
    const newBalanceRaw = val.get('balance');

    console.log(`[受信データ] 商品: ${itemName}, 入力値: ${newBalanceRaw}`);

    if (!itemName || newBalanceRaw === null) {
      ctx.response.status = 400;
      ctx.response.body = 'Missing data';
      return;
    }

    const newBalance = Number(newBalanceRaw);
    const serverTimestamp = new Date().toISOString();

    await dbClient.execute(`UPDATE inventory SET "残量" = $1, "発注量" = $1, last_updated = $2 WHERE "商品名" = $3`, [
      newBalance,
      serverTimestamp,
      itemName
    ]);

    ctx.response.status = 200;
    ctx.response.body = { ok: true };
  } catch (err) {
    console.error('サーバーエラー:', err);
    ctx.response.status = 500;
    ctx.response.body = 'Internal Server Error';
  }
}

// B. 発注ページ表示 (GET /order)
async function renderOrderPage(ctx: Context) {
  const result = await dbClient.execute(
    'SELECT id, "商品名", "残量", "最大保持量", "提案発注量", "発注量", last_updated FROM inventory ORDER BY id ASC'
  );

  interface InventoryItem {
    商品名: string;
    残量: number;
    最大保持量: number;
    提案発注量: number;
    発注量: number;
    last_updated: string | null;
  }

  const inventoryRows = (result ? result.rows : []) as InventoryItem[];

  let tableRowsHtml = '';
  for (const item of inventoryRows) {
    const name = item['商品名'];
    const stock = item['残量'];
    const suggested = item['提案発注量'];
    const timeStr = '--:--';

    tableRowsHtml += `
      <tr>
        <td>${name}</td>
        <td>${stock}</td>
        <td class="suggested-cell">${suggested}</td>
        <td>
          <input type="number" name="balance" class="order-input unconfirmed" value="${suggested}">
        </td>
        <td class="last-updated">${timeStr}</td>
        <td>
          <button type="submit" value="${name}" class="update-btn">更新</button>
        </td>
      </tr>
    `;
  }

  let html = await Deno.readTextFile('./order.html');
  html = html.replace(/<tbody id="order-body">[\s\S]*?<\/tbody>/, `<tbody id="order-body">${tableRowsHtml}</tbody>`);

  ctx.response.body = html;
  ctx.response.type = 'text/html';
}

async function handleAnalysisData(ctx: Context) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids 
       FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    const invResult = await dbClient.execute(`SELECT "商品名", family_score, solo_score FROM inventory`);
    const chartData = invResult.rows;

    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: stats.adults || 0,
      kids: stats.kids || 0,
      chartData: chartData
    };
    ctx.response.type = 'application/json';
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: 'Internal Server Error' };
  }
}

const router = new Router();

router.get('/api/analysis-data', handleAnalysisData);

router.get('/analysis', async (ctx) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

router.post('/api/inventory-update', handleInventoryUpdate);

// --- アプリ起動 ---
const app = new Application();

app.use(async (ctx, next) => {
  ctx.response.headers.set('Access-Control-Allow-Origin', '*');
  ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST,  OPTIONS');
  ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  if (ctx.request.method === 'OPTIONS') {
    ctx.response.status = 204;
    return;
  }
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

console.log('Server running on http://localhost:8000/');
await app.listen({ port: 8000 });
