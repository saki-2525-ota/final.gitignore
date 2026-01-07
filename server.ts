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

// C. 分析ページ表示 (GET /analysis)
async function renderAnalysisPage(ctx: Context) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 予約データの取得
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids 
      FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    // 商品特性データの取得
    const invResult = await dbClient.execute(`SELECT "商品名", family_score, solo_score FROM inventory`);
    const chartData = invResult.rows;

    const template = await Deno.readTextFile('./analysis.html');

    const processedHtml = template
      .replace(/{{tomorrow}}/g, tomorrowStr)
      .replace(/{{adults}}/g, String(stats.adults || 0))
      .replace(/{{kids}}/g, String(stats.kids || 0))
      .replace(/{{chartData}}/g, JSON.stringify(chartData));

    ctx.response.body = processedHtml;
    ctx.response.type = 'text/html';
  } catch (err) {
    console.error('Analysis Page Error:', err);
    ctx.response.status = 500;
    ctx.response.body = 'Internal Server Error';
  }
}

// --- ルーター設定 ---
const router = new Router();

router.get('/analysis', renderAnalysisPage);
router.get('/order', renderOrderPage);
router.get('/inventory', async (ctx) => {
  const html = await Deno.readTextFile('./inventory.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});
router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

router.post('/api/inventory-update', handleInventoryUpdate);

// --- アプリ起動 ---
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx, next) => {
  const paths = ['/analysis', '/order', '/inventory', '/'];
  if (paths.includes(ctx.request.url.pathname)) {
    await next();
    return;
  }

  try {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}`
    });
  } catch {
    await next();
  }
});

console.log('Server running on http://localhost:8000/');
await app.listen({ port: 8000 });
