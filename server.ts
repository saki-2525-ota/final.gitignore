import { Client } from './db/client.ts';
import { Application, Router, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

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

// API: データを送るたびにログを出す
router.get('/api/analysis-data', async (ctx) => {
  console.log('--- API: /api/analysis-data が呼ばれました ---');
  try {
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations`
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    const invResult = await dbClient.execute(
      `SELECT "商品名", COALESCE(family_score, 5) as family_score, COALESCE(solo_score, 5) as solo_score FROM inventory`
    );

    console.log(`データ取得成功: ${invResult.rows.length}件の商品`);

    ctx.response.body = {
      tomorrow: new Date().toISOString().split('T')[0],
      adults: Number(stats.adults || 0),
      kids: Number(stats.kids || 0),
      chartData: invResult.rows
    };
  } catch (err) {
    // err が Error オブジェクトかチェックする
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error('API Error:', errorMessage);
    ctx.response.status = 500;
    ctx.response.body = { error: 'Internal Server Error', details: errorMessage };
  }
});

router.get('/analysis', async (ctx) => {
  console.log('--- Page: /analysis が開かれました ---');
  ctx.response.body = await Deno.readTextFile('./analysis.html');
  ctx.response.type = 'text/html';
});

// 静的ファイルの読み込み
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
    ctx.response.status = 404;
  }
});

console.log('Server started on http://localhost:8000');
await app.listen({ port: 8000 });
