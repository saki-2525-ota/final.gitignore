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

// --- 2. ルート定義（手動読み込み方式） ---

// トップページ
router.get('/', async (ctx) => {
  console.log('Access: /');
  const html = await Deno.readTextFile('./index.html');
  ctx.response.status = 200;
  ctx.response.type = 'text/html; charset=utf-8';
  ctx.response.body = html;
});

// 分析ページ
router.get('/analysis', async (ctx) => {
  console.log('Access: /analysis');
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.status = 200;
  ctx.response.type = 'text/html; charset=utf-8';
  ctx.response.body = html;
});

// API: 分析データ
router.get('/api/analysis-data', async (ctx) => {
  console.log('API Request: /api/analysis-data');
  try {
    const invResult = await dbClient.execute(
      `SELECT "商品名", COALESCE(family_score, 0) as family_score, COALESCE(solo_score, 0) as solo_score FROM inventory`
    );
    ctx.response.status = 200;
    ctx.response.type = 'application/json; charset=utf-8';
    ctx.response.body = {
      tomorrow: new Date().toISOString().split('T')[0],
      adults: 0,
      kids: 0,
      chartData: invResult.rows
    };
  } catch (err: any) {
    console.error('DB Error:', err);
    ctx.response.status = 500;
    ctx.response.body = { error: 'Database error' };
  }
});

// --- 3. サーバー設定 ---
const app = new Application();

// エラーハンドラー（詳細なログを出力）
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Critical Error:', err);
    ctx.response.status = 500;
    ctx.response.body = 'Internal Server Error';
  }
});

app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル処理 (analysis.js や style.css)
app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  if (path === '/') return;

  try {
    const fileContent = await Deno.readFile(`.${path}`);
    if (path.endsWith('.js')) ctx.response.type = 'application/javascript; charset=utf-8';
    if (path.endsWith('.css')) ctx.response.type = 'text/css; charset=utf-8';
    ctx.response.body = fileContent;
  } catch {
    ctx.response.status = 404;
  }
});

console.log('--- サーバー起動成功 (UTF-8強制モード) ---');
await app.listen({ port: 8000 });
