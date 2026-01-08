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

// --- ページ表示用 (UTF-8強制) ---
const serveHtml = async (ctx: any, fileName: string) => {
  try {
    const content = await Deno.readTextFile(fileName);
    ctx.response.status = 200;
    ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
    ctx.response.body = content;
  } catch {
    ctx.response.status = 404;
    ctx.response.body = 'File Not Found';
  }
};

router.get('/', (ctx) => serveHtml(ctx, './index.html'));
router.get('/analysis', (ctx) => serveHtml(ctx, './analysis.html'));
router.get('/order', (ctx) => serveHtml(ctx, './order.html'));
router.get('/reservations', (ctx) => serveHtml(ctx, './reservations.html'));

// --- 【在庫一覧を取得するAPI】 (404エラー対策) ---
router.get('/api/inventory', async (ctx) => {
  try {
    const result = await dbClient.execute(`SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC`);
    ctx.response.status = 200;
    ctx.response.headers.set('Content-Type', 'application/json; charset=utf-8');
    ctx.response.body = result.rows;
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: String(err) };
  }
});

// --- 【在庫を更新するAPI】 ---
router.post('/api/inventory-update', async (ctx) => {
  try {
    const params = await ctx.request.body.form();
    await dbClient.execute(`UPDATE inventory SET "残量" = $1, last_inputter = $2 WHERE "商品名" = $3`, [
      params.get('balance'),
      params.get('last_inputter'),
      params.get('item_id')
    ]);
    ctx.response.body = { status: 'ok' };
  } catch (err) {
    ctx.response.status = 500;
  }
});

// --- 【分析用データAPI】 (予約がなくても必ず返す) ---
router.get('/api/analysis-data', async (ctx) => {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + (9 + 24) * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const resResult = await dbClient.execute(
      `SELECT COALESCE(SUM(adult_count), 0) as adults, COALESCE(SUM(children_count), 0) as kids 
       FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = resResult.rows[0] as any;

    ctx.response.headers.set('Content-Type', 'application/json; charset=utf-8');
    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: Number(stats.adults),
      kids: Number(stats.kids)
    };
  } catch (err) {
    ctx.response.status = 500;
  }
});

// --- 【予約一覧取得API】 ---
router.get('/api/reservations', async (ctx) => {
  try {
    const result = await dbClient.execute(`SELECT * FROM reservations ORDER BY reservation_time ASC`);
    ctx.response.headers.set('Content-Type', 'application/json; charset=utf-8');
    ctx.response.body = result.rows;
  } catch (err) {
    ctx.response.status = 500;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイルの配信
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

console.log('Server started on http://localhost:8000');
await app.listen({ port: 8000 });
