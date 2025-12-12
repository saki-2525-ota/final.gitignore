document.addEventListener('DOMContentLoaded', () => {
  const inventoryForm = document.getElementById('inventory-form');
  const inputterNameField = document.getElementById('inputter-name');
  const hiddenInputterField = document.getElementById('hidden-inputter');

  if (inventoryForm) {
    // 以前の残量バリデーションロジックを保持しつつ、
    // 「更新」ボタンが押されたときに時刻をセットして送信する。

    // submit ボタンがどれか分かるように、クリック時にマークを付ける（fallback 用）
    const submitButtons = inventoryForm.querySelectorAll('button[type="submit"]');
    submitButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        submitButtons.forEach((b) => b.removeAttribute('data-clicked'));
        btn.setAttribute('data-clicked', 'true');
      });
    });

    inventoryForm.addEventListener('submit', (event) => {
      // 1. 担当者名が入力されているかチェック
      if (!inputterNameField.value.trim()) {
        alert('担当者名を入力してください。');
        event.preventDefault();
        return;
      }

      // 2. 担当者名を隠しフィールドにコピー
      hiddenInputterField.value = inputterNameField.value.trim();

      // 3. どの行の「更新」ボタンで送信されたかを特定
      let submitButton = event.submitter || inventoryForm.querySelector('button[type="submit"][data-clicked="true"]');
      if (!submitButton) {
        const active = document.activeElement;
        if (active && active.type === 'submit' && inventoryForm.contains(active)) submitButton = active;
      }

      if (submitButton) {
        const itemId =
          submitButton.value || submitButton.getAttribute('value') || submitButton.dataset.itemId || 'unknown';
        const row = submitButton.closest('tr');
        if (row) {
          // 時刻セルはテーブルの4列目にある想定（index 3）
          let timeCell = null;
          if (row.cells && row.cells.length >= 4) {
            timeCell = row.cells[3];
          } else {
            const tds = row.querySelectorAll('td');
            timeCell = tds[3] || null;
          }

          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          const timeStr = `${hh}:${mm}`;
          if (timeCell) timeCell.textContent = timeStr;

          // フォームに hidden input を追加または更新（サーバーに ISO 時刻を送る）
          const inputName = `timestamp_${itemId}`;
          let hidden = inventoryForm.querySelector(`input[name="${inputName}"]`);
          if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.name = inputName;
            inventoryForm.appendChild(hidden);
          }
          hidden.value = now.toISOString();
        }
      }

      // クリックマークをクリア
      submitButtons.forEach((b) => b.removeAttribute('data-clicked'));
      // 続行してフォーム送信（エラーがあれば event.preventDefault() で止める）
    });
  }
});
