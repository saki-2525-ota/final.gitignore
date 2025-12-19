import { Client } from './db/client.ts';
import { Application, Router, send, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
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

// --- 2. ハンドラ関数 (ロジック) ---

// A. 在庫更新 (POST)
// server.ts の A. 在庫更新 (POST) 部分
async function handleInventoryUpdate(ctx: Context) {
  try {
    const formData = await ctx.request.body.form();

    const itemName = formData.get('item_id');
    const newBalance = formData.get('balance'); // 名前を固定してシンプルに！

    console.log(`[受信] 商品: ${itemName}, 数値: ${newBalance}`);

    if (!itemName || newBalance === null) {
      ctx.response.status = 400;
      ctx.response.body = 'Missing data';
      return;
    }

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

// B. 発注ページ表示 (GET /order)
async function renderOrderPage(ctx: Context) {
  const result = await dbClient.execute(
    'SELECT id, "商品名", "残量", "最大保持量", "提案発注量", "発注量", last_updated FROM inventory ORDER BY id ASC'
  );

  interface InventoryItem {
    商品名: string;
    残量: number;
    最大保持量: number;
    提案発注量: number;
    発注量: number;
    last_updated: string | null;
  }

  const inventoryRows = (result ? result.rows : []) as InventoryItem[];

  let tableRowsHtml = '';
  for (const item of inventoryRows) {
    const name = item['商品名'];
    const stock = item['残量'];
    const suggested = item['提案発注量'];
    const orderInput = item['発注量'];

    let timeStr = item.last_updated
      ? new Date(item.last_updated).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : '--:--';

    // HTMLの修正:
    // 1. inputに name 属性を追加（FormData用）
    // 2. tdに class="last-updated" を追加（order.jsの書き換え用）
    // 3. ボタンから onclick を削除（ReferenceError対策）
    // server.ts のループ内を以下に差し替え
    tableRowsHtml += `
  <tr>
    <td>${name}</td>
    <td>${stock}</td>
    <td class="suggested-cell">${suggested}</td>
    <td>
      <input type="number" 
        name="balance"  
        class="order-input" 
        value="${orderInput}">
    </td>
    <td class="last-updated">${timeStr}</td>
    <td>
      <button type="submit" value="${name}" class="update-btn">更新</button>
    </td>
  </tr>
`;
  }

  let html = await Deno.readTextFile('./order.html');
  html = html.replace('<tbody id="order-body"></tbody>', `<tbody id="order-body">${tableRowsHtml}</tbody>`);
  ctx.response.body = html;
  ctx.response.type = 'text/html';
}

// --- 3. ルーター設定 ---
const router = new Router();

router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

router.get('/order', renderOrderPage);

router.get('/inventory', async (ctx) => {
  const html = await Deno.readTextFile('./inventory.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

router.post('/api/inventory-update', handleInventoryUpdate);

// --- 4. アプリ起動設定 ---
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.use(async (ctx) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}`
    });
  } catch {
    // ファイルがない場合は無視
  }
});

console.log('Server running on http://localhost:8000/');
await app.listen({ port: 8000 });
