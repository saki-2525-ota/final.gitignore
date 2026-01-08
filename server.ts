import { Client } from './db/client.ts';
import { Application, Router } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

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

// --- ページ表示 ---
const serveHtml = async (ctx: any, fileName: string) => {
  const content = await Deno.readTextFile(fileName);
  ctx.response.status = 200;
  ctx.response.type = 'text/html; charset=utf-8';
  ctx.response.body = content;
};

router.get('/', (ctx) => serveHtml(ctx, './index.html'));
router.get('/analysis', (ctx) => serveHtml(ctx, './analysis.html'));
router.get('/order', (ctx) => serveHtml(ctx, './order.html'));

// --- 在庫一覧取得API ---
router.get('/api/inventory', async (ctx) => {
  try {
    const result = await dbClient.execute(`SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC`);
    ctx.response.type = 'application/json; charset=utf-8';
    ctx.response.body = result.rows;
  } catch (err) {
    ctx.response.status = 500;
  }
});

// --- 在庫更新API (Oak v14 修正版) ---
router.post('/api/inventory-update', async (ctx) => {
  try {
    // Oak v14 では .body() は関数ではないため () をつけずに .form() を呼び出します
    const params = await ctx.request.body.form();

    const itemId = params.get('item_id'); // 商品名
    const balance = params.get('balance'); // 入力された数値
    const lastInputter = params.get('last_inputter'); // 担当者名

    console.log(`更新リクエスト受信: ${itemId}, 残量: ${balance}, 担当: ${lastInputter}`);

    // Supabaseへの更新クエリ（カラム名をダブルクォーテーションで囲む）
    await dbClient.execute(`UPDATE inventory SET "残量" = $1, last_inputter = $2 WHERE "商品名" = $3`, [
      balance,
      lastInputter,
      itemId
    ]);

    ctx.response.status = 200;
    ctx.response.body = { status: 'success' };
  } catch (err) {
    console.error('Update Error:', err);
    ctx.response.status = 500;
    ctx.response.body = { status: 'error', message: String(err) };
  }
});

// グラフ用API
router.get('/api/analysis-data', async (ctx) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };
    const invResult = await dbClient.execute(
      `SELECT "商品名", "残量", "提案発注量", COALESCE(family_score, 5) as family_score, COALESCE(solo_score, 5) as solo_score FROM inventory ORDER BY id ASC`
    );
    ctx.response.type = 'application/json; charset=utf-8';
    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: Number(stats.adults || 0),
      kids: Number(stats.kids || 0),
      chartData: invResult.rows
    };
  } catch (err) {
    ctx.response.status = 500;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  try {
    const content = await Deno.readFile(`.${path}`);
    if (path.endsWith('.js')) ctx.response.type = 'application/javascript; charset=utf-8';
    if (path.endsWith('.css')) ctx.response.type = 'text/css; charset=utf-8';
    ctx.response.body = content;
  } catch {
    ctx.response.status = 404;
  }
});

console.log('Server started: http://localhost:8000');
await app.listen({ port: 8000 });
