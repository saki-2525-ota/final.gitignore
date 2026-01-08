import { Client } from './db/client.ts';
import { Application, Router } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
const config = {
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  tls: { enabled: false }
};
const dbClient = new Client(config);
const router = new Router();

// --- 2. ページ表示処理（文字化け対策込み） ---

// トップページ
router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
  ctx.response.body = html;
});

// 分析ページ
router.get('/analysis', async (ctx) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
  ctx.response.body = html;
});

// 発注ページ（DBから最新の在庫・提案量を反映）
router.get('/order', async (ctx) => {
  try {
    const result = await dbClient.execute('SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC');
    const rows = (result ? result.rows : []) as any[];

    let tableRowsHtml = '';
    for (const item of rows) {
      tableRowsHtml += `<tr>
        <td>${item['商品名']}</td>
        <td>${item['残量']}</td>
        <td>${item['提案発注量']}</td>
        <td><input type="number" class="order-input" value="${item['提案発注量']}"></td>
        <td class="last-updated">--:--</td>
        <td><button class="update-btn" value="${item['商品名']}">更新</button></td>
      </tr>`;
    }

    const html = await Deno.readTextFile('./order.html');
    ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
    // HTML内のtbody部分をDBデータで書き換え
    ctx.response.body = html.replace(
      /<tbody id="order-body">[\s\S]*?<\/tbody>/,
      `<tbody id="order-body">${tableRowsHtml}</tbody>`
    );
  } catch (err) {
    console.error('DB Error:', err);
    ctx.response.status = 500;
    ctx.response.body = 'データベース接続エラー';
  }
});

// --- 3. API（分析グラフ用のデータ提供） ---
router.get('/api/analysis-data', async (ctx) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 予約状況
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    // 在庫スコア（グラフ用）
    const invResult = await dbClient.execute(
      `SELECT "商品名", COALESCE(family_score, 0) as family_score, COALESCE(solo_score, 0) as solo_score FROM inventory`
    );

    ctx.response.headers.set('Content-Type', 'application/json; charset=utf-8');
    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: Number(stats.adults || 0),
      kids: Number(stats.kids || 0),
      chartData: invResult.rows
    };
  } catch (err) {
    console.error('API Error:', err);
    ctx.response.status = 500;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル (JS/CSS)
app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  try {
    const content = await Deno.readFile(`.${path}`);
    if (path.endsWith('.js')) ctx.response.headers.set('Content-Type', 'application/javascript; charset=utf-8');
    if (path.endsWith('.css')) ctx.response.headers.set('Content-Type', 'text/css; charset=utf-8');
    ctx.response.body = content;
  } catch {
    ctx.response.status = 404;
  }
});

console.log('Server running on http://localhost:8000');
await app.listen({ port: 8000 });
