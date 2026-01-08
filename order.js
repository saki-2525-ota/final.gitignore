document.addEventListener('DOMContentLoaded', async () => {
  const inventoryForm = document.getElementById('inventory-form');
  const inputterNameField = document.getElementById('inputter-name');
  const tbody = document.getElementById('order-body');

  async function loadInventory() {
    try {
      const response = await fetch('/api/inventory');
      const data = await response.json();

      tbody.innerHTML = '';
      data.forEach((item) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${item['商品名']}</td>
          <td>${item['残量']}</td>
          <td>${item['提案発注量']}</td>
          <td><input type="number" name="balance" class="order-input" value="${item['提案発注量']}"></td>
          <td class="last-updated">--:--</td>
          <td><button type="submit" name="item_id" value="${item['商品名']}" class="update-btn">更新</button></td>
        `;
        tbody.appendChild(row);
      });
    } catch (error) {
      console.error('データ読み込み失敗:', error);
    }
  }

  // 最初に実行
  loadInventory();

  // --- 2. 更新ボタンが押された時の処理 (既存) ---
  if (!inventoryForm) return;
  inventoryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const inputterName = inputterNameField.value.trim();
    if (!inputterName) {
      inputterNameField.style.border = '2px solid red';
      alert('担当者名を入力してください');
      return;
    }
    inputterNameField.style.border = '';

    const clickedButton = event.submitter;
    const itemName = clickedButton.value;
    const row = clickedButton.closest('tr');
    const balanceInput = row.querySelector('input[name="balance"]');
    const timeCell = row.querySelector('.last-updated');

    const now = new Date();
    timeCell.textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    try {
      const params = new URLSearchParams();
      params.append('item_id', itemName);
      params.append('balance', balanceInput.value);
      params.append('last_inputter', inputterName);

      const response = await fetch('/api/inventory-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params
      });

      if (response.ok) {
        balanceInput.style.backgroundColor = '#e0ffe0'; // 成功したら色を変える
      } else {
        timeCell.textContent = 'Error';
      }
    } catch (error) {
      timeCell.textContent = 'Error';
    }
  });
});
