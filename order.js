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

    try {
      // 3. 送信用データを作成（空の FormData から作るのが一番安全）
      const formData = new FormData();
      formData.append('item_id', itemName);
      formData.append('balance', balanceValue);
      formData.append('last_inputter', inputterName);

      const response = await fetch('/api/inventory-update', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        console.log('サーバー側の更新も成功しました');
      } else {
        const msg = await response.text();
        console.error('サーバーがエラーを返しました:', msg);
        timeCell.textContent = 'Error';
      }
    } catch (error) {
      console.error('通信自体に失敗しました:', error);
      timeCell.textContent = 'Error';
    }
  });
});
