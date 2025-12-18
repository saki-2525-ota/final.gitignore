import { Client as PostgresClient } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

export class Client {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  /**
   * データベースに対してSQLを実行し、結果を返します。
   */
  async execute(query: string, params?: any[]) {
    // 1. 接続用のクライアントを作成
    const client = new PostgresClient(this.config);

    try {
      // 2. データベースに接続
      await client.connect();

      // 3. クエリを実行 (結果をオブジェクト形式で取得)
      // queryObject を使うことで、result.rows が [{item_name: 'つくね', ...}] の形になります
      const result = await client.queryObject(query, params);

      // 4. 結果を返す (これで server.ts のエラーが消えます)
      return result;
    } catch (error) {
      console.error('データベースエラー:', error);
      throw error;
    } finally {
      // 5. 最後に必ず接続を閉じる
      await client.end();
    }
  }
}
