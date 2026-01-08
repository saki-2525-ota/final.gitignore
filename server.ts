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

// [発注ページ用]
async function renderOrderPage(ctx: Context) {
  try {
    console.log('--- 発注ページを作成中 ---');

    // Supabaseからデータ取得
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

    let html = await Deno.readTextFile('./order.html');
    html = html.replace(/<tbody id="order-body">[\s\S]*?<\/tbody>/, `<tbody id="order-body">${tableRowsHtml}</tbody>`);

    ctx.response.body = html;
    ctx.response.type = 'text/html';
  } catch (err) {
    console.error('❌ ページ作成エラー:', err);
    ctx.response.status = 500;
    ctx.response.body = 'サーバーエラーが発生しました';
  }
}

// [分析データ取得API用]
async function handleAnalysisData(ctx: Context) {
  try {
    // 1. 日本時間の「明日」の日付を計算
    const now = new Date();
    // Deno Deploy(UTC)から日本時間(+9h)にして、さらに明日(+24h)にする
    const tomorrow = new Date(now.getTime() + 9 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // 2. 予約テーブルから人数の合計を取得
    const resResult = await dbClient.execute(
      `SELECT SUM(adult_count) as adults, SUM(children_count) as kids 
       FROM reservations WHERE reservation_date = $1`,
      [tomorrowStr]
    );
    const stats = (resResult.rows[0] as any) || { adults: 0, kids: 0 };

    // 3. 在庫テーブルからスコアを取得
    const invResult = await dbClient.execute(`SELECT "商品名", family_score, solo_score FROM inventory`);

    // 4. まとめて返却
    ctx.response.body = {
      tomorrow: tomorrowStr,
      adults: Number(stats.adults || 0),
      kids: Number(stats.kids || 0),
      chartData: invResult.rows
    };
    ctx.response.type = 'application/json';
  } catch (err) {
    console.error('API Error:', err);
    ctx.response.status = 500;
    ctx.response.body = { error: 'Internal Server Error' };
  }
}

// --- 3. ルーティング設定 ---
const router = new Router();

// 発注ページ
router.get('/order', renderOrderPage);
router.get('/order.html', renderOrderPage);

// トップページ
router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

// 分析ページ
router.get('/analysis', async (ctx) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});
router.get('/analysis.html', async (ctx) => {
  const html = await Deno.readTextFile('./analysis.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

// API関連
router.get('/api/analysis-data', handleAnalysisData);

router.post('/api/inventory-update', async (ctx) => {
  const body = ctx.request.body;
  const val = await body.form();
  const itemName = val.get('item_id');
  const newBalance = val.get('balance');
  await dbClient.execute(`UPDATE inventory SET "残量" = $1 WHERE "商品名" = $2`, [Number(newBalance), itemName]);
  ctx.response.body = { ok: true };
});

const app = new Application();
