document.addEventListener('DOMContentLoaded', () => {
  const inventoryForm = document.getElementById('inventory-form');
  const inputterNameField = document.getElementById('inputter-name');

  if (inventoryForm) {
    inventoryForm.addEventListener('submit', async (event) => {
      // 1. 【重要】ブラウザの「ページ移動」を止める！
      event.preventDefault();

      // 2. 担当者名チェック
      const inputterName = inputterNameField.value.trim();
      if (!inputterName) {
        alert('担当者名を入力してください。');
        return;
      }

      // 3. クリックされたボタンと、その行の要素を特定
      const clickedButton = event.submitter;
      const row = clickedButton.closest('tr');
      const timeCell = row.querySelector('.last-updated');
      const itemName = clickedButton.value; // ボタンの value="つくね" など

      // 4. その場で時刻を書き換える
      const now = new Date();
      const timeString = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
      timeCell.textContent = timeString;

      // --- ここから下は「裏側」でデータを送る処理 ---
      // ページは移動しませんが、サーバーにはデータが届きます。
      try {
        const formData = new FormData(inventoryForm);
        formData.set('item_id', itemName); // どの商品か
        formData.set('last_inputter', inputterName); // 誰が

        // fetchという機能を使って、バックグラウンドで送信
        const response = await fetch('/api/inventory-update', {
          method: 'POST',
          body: formData
        });
      } catch (error) {
        console.error('通信エラー:', error);
      }
    });
  }
});
