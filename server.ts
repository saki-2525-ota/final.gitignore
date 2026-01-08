import { Client } from './db/client.ts';
import { Application, Router, send, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

const config = {
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  tls: {
    enabled: true,
    caCertificates: []
  }
};

const dbClient = new Client(config);

async function handleInventoryUpdate(ctx: Context) {
  try {
    const body = ctx.request.body;
    const val = await body.form();
    const itemName = val.get('item_id');
    const newBalanceRaw = val.get('balance');

    if (!itemName || newBalanceRaw === null) {
      ctx.response.status = 400;
      ctx.response.body = 'Missing data';
      return;
    }

    const newBalance = Number(newBalanceRaw);
    const serverTimestamp = new Date().toISOString();

    await dbClient.execute(`UPDATE inventory SET "残量" = $1, "発注量" = $1, last_updated = $2 WHERE "商品名" = $3`, [
      newBalance,
      serverTimestamp,
      itemName
    ]);

    ctx.response.status = 200;
    ctx.response.body = { ok: true };
  } catch (err) {
    console.error('サーバーエラー:', err);
    ctx.response.status = 500;
    ctx.response.body = 'Internal Server Error';
  }
}

async function renderOrderPage(ctx: Context) {
  try {
    const result = await dbClient.execute(
      'SELECT id, "商品名", "残量", "最大保持量", "提案発注量", "発注量", last_updated FROM inventory ORDER BY id ASC'
    );

    const inventoryRows = (result ? result.rows : []) as any[];

    let tableRowsHtml = '';
    for (const item of inventoryRows) {
      tableRowsHtml += `
        <tr>
          <td>${item['商品名']}</td>
          <td>${item['残量']}</td>
          <td class="suggested-cell">${item['提案発注量']}</td>
          <td>
            <input type="number" name="balance" class="order-input unconfirmed" value="${item['提案発注量']}">
          </td>
          <td class="last-updated">--:--</td>
          <td>
            <button type="submit" value="${item['商品名']}" class="update-btn">更新</button>
          </td>
        </tr>
      `;
    }

    let html = await Deno.readTextFile('./order.html');
    html = html.replace(/<tbody id="order-body">[\s\S]*?<\/tbody>/, `<tbody id="order-body">${tableRowsHtml}</tbody>`);

    ctx.response.body = html;
    ctx.response.type = 'text/html';
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = 'Error rendering order page';
  }
}

async function handleAnalysisData(ctx: Context) {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids 
       FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };
    const invResult = await dbClient.execute(`SELECT "商品名", family_score, solo_score FROM inventory`);

    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: stats.adults || 0,
      kids: stats.kids || 0,
      chartData: invResult.rows
    };
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: 'Internal Server Error' };
  }
}

const router = new Router();

router.get('/', async (ctx: Context) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

router.get('/order', renderOrderPage);

router.get('/analysis', async (ctx: Context) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

router.get('/api/analysis-data', handleAnalysisData);
router.post('/api/inventory-update', handleInventoryUpdate);

const app = new Application();

app.use(async (ctx: Context, next) => {
  ctx.response.headers.set('Access-Control-Allow-Origin', '*');
  ctx.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  ctx.response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  if (ctx.request.method === 'OPTIONS') {
    ctx.response.status = 204;
    return;
  }
  await next();
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx: Context) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: Deno.cwd(),
      index: 'index.html'
    });
  } catch {}
});

console.log('Server running on http://localhost:8000/');
await app.listen({ port: 8000 });
