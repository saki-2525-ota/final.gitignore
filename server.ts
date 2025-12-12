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
  const formData = await ctx.request.formData();
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

  // 成功後、在庫一覧ページにリダイレクト
  ctx.response.redirect('/inventory');
}
