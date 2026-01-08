import { Client } from './db/client.ts';
import { Application, Router, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
const config = {
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  tls: { enabled: true, caCertificates: [] }
};
const dbClient = new Client(config);

// --- 2. 各ページの処理 ---

// [発注ページ] データを注入して表示
async function renderOrderPage(ctx: Context) {
  try {
    const result = await dbClient.execute('SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC');
    const rows = (result ? result.rows : []) as any[];
    let tableRowsHtml = '';
    for (const item of rows) {
      tableRowsHtml += `
        <tr>
          <td>${item['商品名']}</td>
          <td>${item['残量']}</td>
          <td class="suggested-cell">${item['提案発注量']}</td>
          <td><input type="number" name="balance" class="order-input" value="${item['提案発注量']}"></td>
          <td class="last-updated">--:--</td>
          <td><button type="submit" value="${item['商品名']}" class="update-btn">更新</button></td>
        </tr>`;
    }
    let html = await Deno.readTextFile('./order.html');
    html = html.replace(/<tbody id="order-body">[\s\S]*?<\/tbody>/, `<tbody id="order-body">${tableRowsHtml}</tbody>`);
    ctx.response.body = html;
    ctx.response.type = 'text/html';
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = 'Order page error';
  }
}

// [分析データAPI]
async function handleAnalysisData(ctx: Context) {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };
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

// --- 3. ルーター設定（ここで全てのURLを登録する） ---
const router = new Router();

// トップページ
router.get('/', async (ctx) => {
  ctx.response.body = await Deno.readTextFile('./index.html');
  ctx.response.type = 'text/html';
});

// 発注ページ
router.get('/order', renderOrderPage);
router.get('/order.html', renderOrderPage);

// 分析ページ
router.get('/analysis', async (ctx) => {
  ctx.response.body = await Deno.readTextFile('./analysis.html');
  ctx.response.type = 'text/html';
});
router.get('/analysis.html', async (ctx) => {
  ctx.response.body = await Deno.readTextFile('./analysis.html');
  ctx.response.type = 'text/html';
});

// ★追加：在庫一覧ページ (ファイルがある場合)
router.get('/inventory.html', async (ctx) => {
  try {
    ctx.response.body = await Deno.readTextFile('./inventory.html');
    ctx.response.type = 'text/html';
  } catch {
    ctx.response.status = 404;
    ctx.response.body = 'inventory.html が見つかりません';
  }
});

// ★追加：予約ページ (ファイルがある場合)
router.get('/reservations.html', async (ctx) => {
  try {
    ctx.response.body = await Deno.readTextFile('./reservations.html');
    ctx.response.type = 'text/html';
  } catch {
    ctx.response.status = 404;
    ctx.response.body = 'reservations.html が見つかりません';
  }
});

// API関連
router.get('/api/analysis-data', handleAnalysisData);
router.post('/api/inventory-update', async (ctx) => {
  const body = ctx.request.body;
  const val = await body.form();
  const itemName = val.get('item_id');
  const newBalance = val.get('balance');
  await dbClient.execute(`UPDATE inventory SET "残量" = $1 WHERE "商品名" = $2`, [Number(newBalance), itemName]);
  ctx.response.body = { ok: true };
});

// --- 4. アプリ起動と静的ファイル対策 ---
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// CSS/JS/HTMLファイルを直接読み込むための汎用設定
app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  try {
    const content = await Deno.readFile(`.${path}`);
    if (path.endsWith('.css')) ctx.response.type = 'text/css';
    else if (path.endsWith('.js')) ctx.response.type = 'application/javascript';
    else if (path.endsWith('.html')) ctx.response.type = 'text/html';
    ctx.response.body = content;
  } catch {
    // ファイルがない場合は無視して404
  }
});

console.log('Server is running!');
await app.listen({ port: 8000 });
