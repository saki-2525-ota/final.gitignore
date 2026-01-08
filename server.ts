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

// --- 2. ルート設定 (URLとファイルの紐付け) ---

// (A) トップページ: http://...deno.dev/
router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
  ctx.response.body = html;
});

// (B) 分析ページ: http://...deno.dev/analysis
router.get('/analysis', async (ctx) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
  ctx.response.body = html;
});

// (C) データ取得API
router.get('/api/analysis-data', async (ctx) => {
  try {
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids FROM reservations`
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    const invResult = await dbClient.execute(
      `SELECT "商品名", COALESCE(family_score, 0) as family_score, COALESCE(solo_score, 0) as solo_score FROM inventory`
    );

    ctx.response.headers.set('Content-Type', 'application/json; charset=utf-8');
    ctx.response.body = {
      tomorrow: new Date().toISOString().split('T')[0],
      adults: Number(stats.adults || 0),
      kids: Number(stats.kids || 0),
      chartData: invResult.rows
    };
  } catch (err: any) {
    ctx.response.status = 500;
    ctx.response.body = { error: String(err) };
  }
});

// --- 3. サーバーの起動設定 ---
const app = new Application();

// ルーターを登録
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル (CSS/JS) の読み込み処理
app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  // ルート以外のファイルリクエスト（style.cssやanalysis.jsなど）を処理
  if (path !== '/') {
    try {
      const content = await Deno.readFile(`.${path}`);
      if (path.endsWith('.css')) ctx.response.headers.set('Content-Type', 'text/css; charset=utf-8');
      if (path.endsWith('.js')) ctx.response.headers.set('Content-Type', 'application/javascript; charset=utf-8');
      ctx.response.body = content;
    } catch {
      // ファイルがない場合は404
      ctx.response.status = 404;
      ctx.response.body = 'File Not Found';
    }
  }
});

console.log('--- Server Started! ---');
await app.listen({ port: 8000 });
