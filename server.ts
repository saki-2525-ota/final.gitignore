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

// --- ページ表示 (UTF-8強制) ---
const serveHtml = async (ctx: any, fileName: string) => {
  const content = await Deno.readTextFile(fileName);
  ctx.response.status = 200;
  ctx.response.type = 'text/html; charset=utf-8';
  ctx.response.body = content;
};

router.get('/', (ctx) => serveHtml(ctx, './index.html'));
router.get('/analysis', (ctx) => serveHtml(ctx, './analysis.html'));
router.get('/order', (ctx) => serveHtml(ctx, './order.html'));

// --- データAPI (これがグラフと予約状況の命です) ---
router.get('/api/analysis-data', async (ctx) => {
  try {
    const now = new Date();
    // 日本時間の明日
    const tomorrow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 予約データ
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    // 在庫データ
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
    console.error('API Error:', err);
    ctx.response.status = 500;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル処理
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
