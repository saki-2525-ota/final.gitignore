document.addEventListener('DOMContentLoaded', () => {
  const inventoryForm = document.getElementById('inventory-form');
  const inputterNameField = document.getElementById('inputter-name');

  if (!inventoryForm) return;

  inventoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 1. 担当者チェック
    const inputterName = inputterNameField.value.trim();
    if (!inputterName) {
      inputterNameField.style.border = '2px solid red';
      return;
    }
    inputterNameField.style.border = '';

    // 2. 押されたボタンとその行の数値を取得
    const clickedButton = event.submitter;
    const itemName = clickedButton.value;
    const row = clickedButton.closest('tr');

    // その行(row)の中にある input を探す
    const balanceInput = row.querySelector('input[name="balance"]');
    const balanceValue = balanceInput.value;
    const timeCell = row.querySelector('.last-updated');

    console.log(`[送信直前] 商品: ${itemName}, 数値: ${balanceValue}`);

    // 時刻の仮更新
    const now = new Date();
    timeCell.textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    // order.js の fetch 部分を以下に書き換え
    try {
      // 送るデータを準備
      const params = new URLSearchParams();
      params.append('item_id', itemName);
      params.append('balance', balanceValue);
      params.append('last_inputter', inputterName);

      console.log('送るデータ:', params.toString()); // ブラウザのF12コンソールで確認用

      // order.js の fetch 成功時の処理を書き換え
      const response = await fetch('/api/inventory-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params
      });

      if (response.ok) {
        console.log('サーバー更新完了');

        // --- ここで見た目を変更する ---
        balanceInput.classList.remove('unconfirmed'); // グレーを消す
        balanceInput.classList.add('confirmed'); // 黒くする
        // ---------------------------
      } else {
        const msg = await response.text();
        console.error('サーバーエラー:', msg);
        timeCell.textContent = 'Error';
      }
    } catch (error) {
      console.error('通信失敗:', error);
      timeCell.textContent = 'Error';
    }
  });
});
