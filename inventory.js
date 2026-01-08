const API_URL = 'https://final-git.saki-2525-ota.deno.net';

document.getElementById('inventory-form').addEventListener('submit', async (e) => {
  e.preventDefault(); // 通常の画面遷移（ページ移動）を止める

  // フォームの入力内容をすべて取得
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());

  try {
    const response = await fetch(`${API_URL}/api/inventory-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data) // データをJSONにして送る
    });

    if (response.ok) {
      alert('在庫情報を更新しました！');
    } else {
      alert('保存に失敗しました。');
    }
  } catch (error) {
    console.error('通信エラー:', error);
    alert('サーバーに接続できませんでした。');
  }
});
