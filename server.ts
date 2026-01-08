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

// --- API: 分析データ ---
router.get('/api/analysis-data', async (ctx) => {
  try {
    const invResult = await dbClient.execute(
      `SELECT "商品名", COALESCE(family_score, 0) as family_score, COALESCE(solo_score, 0) as solo_score FROM inventory`
    );

    // 文字化け対策: JSONデータにUTF-8を強制
    ctx.response.type = 'application/json';
    ctx.response.headers.set('Content-Type', 'application/json; charset=utf-8');
    ctx.response.body = {
      tomorrow: new Date().toISOString().split('T')[0],
      adults: 0,
      kids: 0,
      chartData: invResult.rows
    };
  } catch (err: any) {
    ctx.response.status = 500;
    ctx.response.body = { error: String(err) };
  }
});

// --- ページ表示 ---
router.get('/analysis', async (ctx) => {
  try {
    const html = await Deno.readTextFile('./analysis.html');
    // 文字化け対策: HTMLにUTF-8を強制
    ctx.response.type = 'text/html';
    ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
    ctx.response.body = html;
  } catch {
    ctx.response.status = 404;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル (analysis.js や style.css)
app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  try {
    const content = await Deno.readFile(`.${path}`);
    if (path.endsWith('.js')) {
      ctx.response.type = 'application/javascript';
      ctx.response.headers.set('Content-Type', 'application/javascript; charset=utf-8');
    } else if (path.endsWith('.css')) {
      ctx.response.type = 'text/css';
      ctx.response.headers.set('Content-Type', 'text/css; charset=utf-8');
    }
    ctx.response.body = content;
  } catch {
    ctx.response.status = 404;
  }
});

console.log('Server started - UTF-8 forced');
await app.listen({ port: 8000 });
