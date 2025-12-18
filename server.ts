import { Client } from './db/client.ts';
import { Application, Router, send, Context } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

// --- 1. データベース設定 ---
// server.ts の接続部分
const config = {
  // 1. ソウルのプーラー用ホスト名に変更
  hostname: 'aws-1-ap-northeast-2.pooler.supabase.com',
  // 2. ポートはプーラー用の 6543
  port: 6543,
  // 3. ユーザー名にプロジェクトIDを付与
  user: 'postgres.fcxkkifntnubfxmnakpi',
  database: 'postgres',
  password: 'password0711',
  // SSLエラー対策
  tls: {
    enabled: true,
    caCertificates: []
  }
};

const dbClient = new Client(config);

const MAX_STOCK: Record<string, number> = {
  つくね: 10,
  かわ: 10,
  ぼんじり: 10,
  きも: 10,
  はつ: 10,
  ささみ: 10,
  せせり: 10,
  ねぎま: 10,
  トマト: 8,
  なす: 5,
  きゅうり: 7,
  はくさい: 5,
  うずらの卵: 30,
  生卵: 30,
  フライドポテト: 6,
  豆腐: 5,
  鶏むね肉: 10,
  生ビール樽: 3,
  ハイボール: 4,
  サワーベース: 3,
  カルピス: 3,
  オレンジジュース: 3,
  コーラ: 3,
  レモンシロップ: 5,
  イチゴシロップ: 5,
  マンゴーシロップ: 5,
  ごま油: 2,
  ポン酢: 2,
  醤油: 2,
  マヨネーズ: 3,
  ケチャップ: 3
};

// --- 2. ハンドラ関数 (ロジック) ---

// A. 在庫更新 (POST)
async function handleInventoryUpdate(ctx: any) {
  const body = await ctx.request.body({ type: 'form' });
  const formData = await body.value;
  const inputterName = formData.get('last_inputter');
  const itemName = formData.get('item_id');
  const newBalance = formData.get(`balance_${itemName}`);

  if (!inputterName || !itemName || !newBalance) {
    ctx.response.status = 400;
    ctx.response.body = { error: '入力データが不足しています' };
    return;
  }

  const serverTimestamp = new Date().toISOString();
  await dbClient.execute(
    `UPDATE inventory SET balance = $1, last_inputter = $2, last_updated = $3 WHERE item_name = $4`,
    [newBalance, inputterName, serverTimestamp, itemName]
  );

  ctx.response.status = 200;
  ctx.response.body = { message: '更新完了', time: serverTimestamp };
}

// B. 発注ページ表示 (GET /order)

async function renderOrderPage(ctx: Context) {
  // 1. SQLで5つの列すべてを取得します
  const result = await dbClient.execute(
    'SELECT "商品名", "残量", "最大保持量", "提案発注量", "発注量", last_updated FROM inventory ORDER BY "商品名" ASC'
  );

  // 2. インターフェースも5つの列に合わせて定義します
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
    // 3. データベースから各数値を取り出します
    const name = item['商品名'];
    const stock = item['残量'];
    const maxStock = item['最大保持量'];
    const suggested = item['提案発注量'];
    const orderInput = item['発注量']; // 前回保存された発注量

    // 更新時刻の表示処理
    let timeStr = '--:--';
    if (item.last_updated) {
      timeStr = new Date(item.last_updated).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    tableRowsHtml += `
      <tr>
        <td>${name}</td>
        <td>${stock}</td>
        <td>${maxStock}</td>
        <td class="suggested-cell">${suggested}</td>
        <td>
          <input type="number" class="order-input" value="${orderInput}" data-item="${name}">
        </td>
        <td>${timeStr}</td>
      </tr>
  `;
  }

  let html = await Deno.readTextFile('./order.html');
  // 目印 を置換
  html = html.replace('<tbody id="order-body"></tbody>', tableRowsHtml);
  ctx.response.body = html;
  ctx.response.type = 'text/html';
}

// --- 3. ルーター設定 ---
const router = new Router();

// トップページ (http://localhost:8000/)
router.get('/', async (ctx) => {
  const html = await Deno.readTextFile('./index.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

// 発注ページ
router.get('/order', renderOrderPage);

// 在庫一覧ページ
router.get('/inventory', async (ctx) => {
  const html = await Deno.readTextFile('./inventory.html');
  ctx.response.body = html;
  ctx.response.type = 'text/html';
});

// 更新API
router.post('/api/inventory-update', handleInventoryUpdate);

// --- 4. アプリ起動設定 ---
const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル（CSS/JS）の配信
app.use(async (ctx) => {
  try {
    await send(ctx, ctx.request.url.pathname, {
      root: `${Deno.cwd()}`
    });
  } catch {
    // 該当ファイルがない場合は何もしない
  }
});

console.log('Server running on http://localhost:8000/');
await app.listen({ port: 8000 });
