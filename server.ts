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

const serveHtml = async (ctx: any, fileName: string) => {
  const content = await Deno.readTextFile(fileName);
  ctx.response.status = 200;
  ctx.response.type = 'text/html; charset=utf-8'; // ここで文字化けを防止
  ctx.response.body = content;
};

router.get('/', (ctx) => serveHtml(ctx, './index.html'));
router.get('/analysis', (ctx) => serveHtml(ctx, './analysis.html'));
router.get('/order', (ctx) => serveHtml(ctx, './order.html'));
router.get('/reservations', (ctx) => serveHtml(ctx, './reservations.html')); // 予約ページ追加

// --- 予約データ取得API (今日の日付分) ---
router.get('/api/reservations', async (ctx) => {
  try {
    const now = new Date();
    // 日本時間にするために+9時間
    const today = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const todayStr = today.toISOString().split('T')[0];

    const result = await dbClient.execute(
      `SELECT * FROM reservations WHERE reservation_date = $1 ORDER BY reservation_time ASC`,
      [todayStr]
    );
    ctx.response.type = 'application/json; charset=utf-8';
    ctx.response.body = result.rows;
  } catch (err) {
    ctx.response.status = 500;
  }
});

// 在庫一覧API
router.get('/api/inventory', async (ctx) => {
  const result = await dbClient.execute(`SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC`);
  ctx.response.type = 'application/json; charset=utf-8';
  ctx.response.body = result.rows;
});

// 在庫更新API
router.post('/api/inventory-update', async (ctx) => {
  const params = await ctx.request.body.form();
  await dbClient.execute(`UPDATE inventory SET "残量" = $1, last_inputter = $2 WHERE "商品名" = $3`, [
    params.get('balance'),
    params.get('last_inputter'),
    params.get('item_id')
  ]);
  ctx.response.body = { status: 'ok' };
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

console.log('Server started on http://localhost:8000');
await app.listen({ port: 8000 });
