import { Client } from './db/client.ts';
import { Application, Router, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
const config = {
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  tls: { enabled: false } // TLSエラー対策
};
const dbClient = new Client(config);

// --- 2. 処理関数 (Routerの前に定義する必要があります) ---

// 分析データAPI
async function handleAnalysisData(ctx: Context) {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 予約合計 (0人でもエラーにならない)
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    // 商品スコア (全件取得)
    const invResult = await dbClient.execute(`SELECT "商品名", family_score, solo_score FROM inventory`);

    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: Number(stats.adults || 0),
      kids: Number(stats.kids || 0),
      chartData: invResult.rows || []
    };
    ctx.response.type = 'application/json';
  } catch (err) {
    console.error('API Error:', err);
    ctx.response.status = 500;
    ctx.response.body = { error: 'Internal Server Error' };
  }
}

// 予約一覧API
async function handleReservations(ctx: Context) {
  try {
    const result = await dbClient.execute(`SELECT * FROM reservations ORDER BY id DESC`);
    ctx.response.body = result.rows || [];
    ctx.response.type = 'application/json';
  } catch (err) {
    ctx.response.body = [];
  }
}

// --- 3. ルーター設定 ---
const router = new Router();

router.get('/', async (ctx) => {
  try {
    const html = await Deno.readTextFile('./index.html');
    ctx.response.body = html;
    ctx.response.type = 'text/html';
  } catch {
    ctx.response.body = 'index.html not found';
  }
});

router.get('/order', async (ctx) => {
  try {
    const result = await dbClient.execute('SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC');
    const rows = (result ? result.rows : []) as any[];
    let tableRowsHtml = '';
    for (const item of rows) {
      tableRowsHtml += `<tr><td>${item['商品名']}</td><td>${item['残量']}</td><td>${item['提案発注量']}</td><td><input type="number" name="balance" class="order-input" value="${item['提案発注量']}"></td><td class="last-updated">--:--</td><td><button type="submit" value="${item['商品名']}" class="update-btn">更新</button></td></tr>`;
    }
    let html = await Deno.readTextFile('./order.html');
    ctx.response.body = html.replace(
      /<tbody id="order-body">[\s\S]*?<\/tbody>/,
      `<tbody id="order-body">${tableRowsHtml}</tbody>`
    );
    ctx.response.type = 'text/html';
  } catch {
    ctx.response.body = 'order.html error';
  }
});

router.get('/analysis', async (ctx) => {
  try {
    ctx.response.body = await Deno.readTextFile('./analysis.html');
    ctx.response.type = 'text/html';
  } catch {
    ctx.response.body = 'analysis.html not found';
  }
});

// API登録
router.get('/api/analysis-data', handleAnalysisData);
router.get('/api/reservations', handleReservations);

// --- 4. サーバー起動と静的ファイル設定 ---
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// CSS/JS用の汎用設定
app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  if (path.includes('.')) {
    try {
      const content = await Deno.readFile(`.${path}`);
      if (path.endsWith('.css')) ctx.response.type = 'text/css';
      if (path.endsWith('.js')) ctx.response.type = 'application/javascript';
      ctx.response.body = content;
    } catch {
      ctx.response.status = 404;
    }
  }
});

console.log('Server is starting...');
await app.listen({ port: 8000 });
