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

// A. 在庫更新 (POST)
// server.ts の handleInventoryUpdate をこれに差し替え
async function handleInventoryUpdate(ctx: Context) {
  try {
    // URLSearchParams 形式のデータを取得
    const body = ctx.request.body;
    const val = await body.form(); // ここを .form() にするのがポイント

    const itemName = val.get('item_id');
    const newBalanceRaw = val.get('balance');

    // ターミナルでこれが null にならないかチェック！
    console.log(`[受信データ] 商品: ${itemName}, 入力値: ${newBalanceRaw}`);

    if (!itemName || newBalanceRaw === null) {
      ctx.response.status = 400;
      ctx.response.body = 'Missing data: ' + (itemName ? '' : 'item_id ') + (newBalanceRaw ? '' : 'balance');
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
  // server.ts の renderOrderPage 内のループ処理を修正
  for (const item of inventoryRows) {
    const name = item['商品名'];
    const stock = item['残量'];
    const suggested = item['提案発注量']; // 常にこれを使う

    // 【修正】リロード時は DB の値ではなく常に '--:--' を表示させる
    const timeStr = '--:--';

    tableRowsHtml += `
      <tr>
        <td>${name}</td>
        <td>${stock}</td>
        <td class="suggested-cell">${suggested}</td>
        <td>
          <input type="number" 
            name="balance" 
            class="order-input unconfirmed" 
            value="${suggested}"> </td>
        <td class="last-updated">${timeStr}</td>
        <td>
          <button type="submit" value="${name}" class="update-btn">更新</button>
        </td>
      </tr>
    `;
  }

  // server.ts の renderOrderPage の最後の方
  let html = await Deno.readTextFile('./order.html');

  // 【修正】正規表現を使い、<tbody>の中身が空でも、改行があっても確実に置換します
  html = html.replace(/<tbody id="order-body">[\s\S]*?<\/tbody>/, `<tbody id="order-body">${tableRowsHtml}</tbody>`);

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
