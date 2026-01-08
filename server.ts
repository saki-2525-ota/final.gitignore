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

// 文字化け防止のためのHTML送信関数
const serveHtml = async (ctx: any, fileName: string) => {
  try {
    const content = await Deno.readTextFile(fileName);
    ctx.response.status = 200;
    // ここで明示的にUTF-8を指定します
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
router.get('/reservations', (ctx) => serveHtml(ctx, './reservations.html')); // パスを定義

// 予約データ取得API
router.get('/api/reservations', async (ctx) => {
  try {
    const result = await dbClient.execute(`SELECT * FROM reservations ORDER BY reservation_time ASC`);
    ctx.response.type = 'application/json; charset=utf-8';
    ctx.response.body = result.rows;
  } catch (err) {
    ctx.response.status = 500;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイルの配信設定
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
