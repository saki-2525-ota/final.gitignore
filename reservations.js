document.addEventListener('DOMContentLoaded', () => {
  const dateTarget = document.getElementById('display-date-target');

  if (dateTarget) {
    // 今日の日付を取得
    const today = new Date();

    // 曜日の配列
    const days = ['日', '月', '火', '水', '木', '金', '土'];

    // サイトで紹介されている古典的な方法で整形
    const year = today.getFullYear();
    const month = today.getMonth() + 1; // getMonth()は0から始まるため+1
    const date = today.getDate();
    const day = days[today.getDay()];

    // 日本語文字列を組み立て
    const formattedDate = `${year}年${month}月${date}日 (${day})`;

    // HTML要素に日付を反映
    dateTarget.textContent = formattedDate;
  }
});
