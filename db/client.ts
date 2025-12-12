export class Client {
  config: any;
  constructor(config: any) {
    this.config = config;
  }

  async execute(query: string, params?: any[]) {
    // 実運用ではここで実際の DB クライアントの実行を書く。
    // 現在はスタブとしてログ出力のみ行う。
    console.log('DB execute:', query, params);
    return;
  }
}
