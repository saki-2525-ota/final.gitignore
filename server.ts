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

// --- ページ表示 (すべて charset=utf-8 を付与) ---

router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.status = 200;
  ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
  ctx.response.body = html;
});

router.get('/analysis', async (ctx) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.status = 200;
  ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
  ctx.response.body = html;
});

router.get('/order', async (ctx) => {
  try {
    const result = await dbClient.execute('SELECT "商品名", "残量", "提案発注量" FROM inventory ORDER BY id ASC');
    const rows = (result ? result.rows : []) as any[];
    let tableRowsHtml = '';
    for (const item of rows) {
      tableRowsHtml += `<tr>
        <td>${item['商品名']}</td>
        <td>${item['残量']}</td>
        <td>${item['提案発注量']}</td>
        <td><input type="number" class="order-input" value="${item['提案発注量']}"></td>
        <td class="last-updated">--:--</td>
        <td><button class="update-btn">更新</button></td>
      </tr>`;
    }
    const html = await Deno.readTextFile('./order.html');
    ctx.response.status = 200;
    ctx.response.headers.set('Content-Type', 'text/html; charset=utf-8');
    ctx.response.body = html.replace(
      /<tbody id="order-body">[\s\S]*?<\/tbody>/,
      `<tbody id="order-body">${tableRowsHtml}</tbody>`
    );
  } catch {
    ctx.response.status = 500;
    ctx.response.body = 'データベースエラー';
  }
});

// API
router.get('/api/analysis-data', async (ctx) => {
  try {
    const invResult = await dbClient.execute(`SELECT "商品名", family_score, solo_score FROM inventory`);
    ctx.response.headers.set('Content-Type', 'application/json; charset=utf-8');
    ctx.response.body = {
      tomorrow: new Date().toISOString().split('T')[0],
      adults: 0,
      kids: 0,
      chartData: invResult.rows
    };
  } catch {
    ctx.response.status = 500;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル
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

console.log('Server running: charset forced on all routes');
await app.listen({ port: 8000 });
