import { Client } from './db/client.ts';
// Context 型の明示的なインポートを避け、互換性のため any を使用します。

// データベース接続設定（環境変数から取得するなど）
const config = {
  user: 'your_user',
  database: 'your_db',
  hostname: 'your_host',
  password: 'your_password',
  port: 5432
};

// 接続クライアントを作成し、エクスポート
export const dbClient = new Client(config);

async function handleInventoryUpdate(ctx: any) {
  // 1. フォームデータから手動入力された値を取得
  const body = await ctx.request.body({ type: 'form' });
  const formData = body.value;
  const inputterName = formData.get('last_inputter') as string;
  const itemName = formData.get('item_id') as string;
  const newBalance = formData.get(`balance_${itemName}`) as string;

  // 2. サーバー側で現在の時刻（タイムスタンプ）を生成
  // データベースのタイムスタンプフィールドに直接格納できる形式
  const serverTimestamp = new Date().toISOString(); // 例: "2025-12-12T02:45:00.000Z"

  if (!inputterName || !newBalance) {
    // エラー処理
    return;
  }

  // 3. データベースを更新 (server-database, server-postの知識を活用)
  // 担当者名と時刻（タイムスタンプ）の両方を記録
  await dbClient.execute(
    `
        UPDATE inventory_table 
        SET current_balance = $1, 
          last_inputter = $2, 
          updated_at = $3
        WHERE item_name = $4
    `,
    [newBalance, inputterName, serverTimestamp, itemName]
  );

  // 成功後、在庫一覧ページ（静的ファイル）にリダイレクト
  ctx.response.redirect('/inventory.html');
}

// --- 以下：最小サーバ実装（静的配信 + POST ハンドラ） ---
declare const Deno: any;
// TypeChecker 環境で外部 URL 解決ができない場合があるため一時的に suppress
// @ts-ignore
import { Application, Router, send } from 'https://deno.land/x/oak@v14.0.0/mod.ts';

const router = new Router();
router.post('/api/inventory-update', async (ctx: any) => {
  try {
    await handleInventoryUpdate(ctx);
  } catch (err) {
    console.error('handleInventoryUpdate error:', err);
    ctx.response.status = 500;
    ctx.response.body = 'Internal Server Error';
  }
});

const app = new Application();

// ロガー
app.use(async (ctx: any, next: any) => {
  await next();
  console.log(`${ctx.request.method} ${ctx.request.url} -> ${ctx.response.status}`);
});

// ルーター（API）
app.use(router.routes());
app.use(router.allowedMethods());

// 静的ファイル配信（ルートにあるファイルを返す）
app.use(async (ctx: any) => {
  const filePath = ctx.request.url.pathname === '/' ? '/index.html' : ctx.request.url.pathname;
  try {
    await send(ctx, filePath, { root: Deno.cwd() });
  } catch {
    ctx.response.status = 404;
    ctx.response.body = 'Not Found';
  }
});

const PORT = Number(Deno.env.get('PORT') || 8000);
console.log(`Starting server on :${PORT}`);
await app.listen({ port: PORT });
