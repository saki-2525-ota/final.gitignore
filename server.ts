import { Client } from './db/client.ts';
import { Application, Router, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
const config = {
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  tls: { enabled: false } // ログの赤文字エラーを回避するためfalseに設定
};
const dbClient = new Client(config);

// --- 2. 処理関数 ---

// 発注ページ作成
async function renderOrderPage(ctx: Context) {
  try {
    const result = await dbClient.execute('SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC');
    const rows = (result ? result.rows : []) as any[];
    let tableRowsHtml = '';
    for (const item of rows) {
      tableRowsHtml += `<tr><td>${item['商品名']}</td><td>${item['残量']}</td><td class="suggested-cell">${item['提案発注量']}</td><td><input type="number" name="balance" class="order-input unconfirmed" value="${item['提案発注量']}"></td><td class="last-updated">--:--</td><td><button type="submit" value="${item['商品名']}" class="update-btn">更新</button></td></tr>`;
    }
    let html = await Deno.readTextFile('./order.html');
    html = html.replace(/<tbody id="order-body">[\s\S]*?<\/tbody>/, `<tbody id="order-body">${tableRowsHtml}</tbody>`);
    ctx.response.body = html;
    ctx.response.type = 'text/html';
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = 'Server Error';
  }
}

// 【グラフ用】分析データAPI
async function handleAnalysisData(ctx: Context) {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 予約合計
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    // 商品ごとのスコア
    const invResult = await dbClient.execute(`SELECT "商品名", family_score, solo_score FROM inventory`);

    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: Number(stats.adults || 0),
      kids: Number(stats.kids || 0),
      chartData: invResult.rows
    };
    ctx.response.type = 'application/json';
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: 'API Error' };
  }
}

// 予約一覧API
async function handleReservations(ctx: Context) {
  try {
    const result = await dbClient.execute(`SELECT * FROM reservations ORDER BY reservation_date DESC`);
    ctx.response.body = result.rows || [];
    ctx.response.type = 'application/json';
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: 'DB Error' };
  }
}

// --- 3. ルーター設定 ---
const router = new Router();

router.get('/', async (ctx) => {
  ctx.response.body = await Deno.readTextFile('./index.html');
  ctx.response.type = 'text/html';
});
router.get('/order', renderOrderPage);
router.get('/order.html', renderOrderPage);
router.get('/analysis', async (ctx) => {
  ctx.response.body = await Deno.readTextFile('./analysis.html');
  ctx.response.type = 'text/html';
});

// API（ここが抜けていたため404になっていました）
router.get('/api/analysis-data', handleAnalysisData);
router.get('/api/reservations', handleReservations);
router.post('/api/inventory-update', async (ctx) => {
  const body = ctx.request.body;
  const val = await body.form();
  await dbClient.execute(`UPDATE inventory SET "残量" = $1 WHERE "商品名" = $2`, [
    Number(val.get('balance')),
    val.get('item_id')
  ]);
  ctx.response.body = { ok: true };
});

// --- 4. 静的ファイル対策 ---
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  try {
    const content = await Deno.readFile(`.${path}`);
    if (path.endsWith('.css')) ctx.response.type = 'text/css';
    if (path.endsWith('.js')) ctx.response.type = 'application/javascript';
    ctx.response.body = content;
  } catch {
    // 404
  }
});

console.log('Server is running!');
await app.listen({ port: 8000 });
