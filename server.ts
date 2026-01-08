import { Client } from './db/client.ts';
import { Application, Router, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
const config = {
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 6543,
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  tls: { enabled: true, caCertificates: [] }
};

const dbClient = new Client(config);

// --- 2. データをHTMLに入れ込む関数 ---
async function renderOrderPage(ctx: Context) {
  try {
    console.log('--- 発注ページを作成中 ---');

    // Supabaseからデータ取得 (スコアは取得するが表示はしない)
    const result = await dbClient.execute(
      'SELECT "商品名", "残量", "提案発注量", family_score, solo_score FROM inventory ORDER BY id ASC'
    );
    const rows = (result ? result.rows : []) as any[];
    console.log(`取得データ数: ${rows.length}件`);

    let tableRowsHtml = '';
    for (const item of rows) {
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
        </tr>`;
    }

    // HTMLファイルを読み込む
    let html = await Deno.readTextFile('./order.html');

    // 【重要】tbodyの中身を確実に置き換える（スペースがあっても大丈夫なように正規表現を使用）
    html = html.replace(/<tbody id="order-body">[\s\S]*?<\/tbody>/, `<tbody id="order-body">${tableRowsHtml}</tbody>`);

    ctx.response.body = html;
    ctx.response.type = 'text/html';
  } catch (err) {
    console.error('❌ ページ作成エラー:', err);
    ctx.response.status = 500;
    ctx.response.body = 'サーバーエラーが発生しました';
  }
}

// --- 3. ルーティング設定 ---
const router = new Router();

// /order でも /order.html でも同じ関数（データ注入版）を呼ぶようにする
router.get('/order', renderOrderPage);
router.get('/order.html', renderOrderPage);

router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

// 分析ページ用
router.get('/analysis', async (ctx) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

// API
router.post('/api/inventory-update', async (ctx) => {
  // 既存の更新処理...
  const body = ctx.request.body;
  const val = await body.form();
  const itemName = val.get('item_id');
  const newBalance = val.get('balance');
  await dbClient.execute(`UPDATE inventory SET "残量" = $1 WHERE "商品名" = $2`, [Number(newBalance), itemName]);
  ctx.response.body = { ok: true };
});

// --- 4. アプリ起動と静的ファイル対策 ---
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// CSSやJSファイルを読み込むための設定（sendを使わない方法）
app.use(async (ctx) => {
  const path = ctx.request.url.pathname;
  if (path.endsWith('.css') || path.endsWith('.js')) {
    try {
      const content = await Deno.readFile(`.${path}`);
      ctx.response.body = content;
      ctx.response.type = path.endsWith('.css') ? 'text/css' : 'application/javascript';
    } catch {
      ctx.response.status = 404;
    }
  }
});

console.log('Server running on http://localhost:8000/');
await app.listen({ port: 8000 });
