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
    });
  }
});
