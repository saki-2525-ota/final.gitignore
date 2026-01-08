const API_URL = ''; // 自分のサーバーを使うので空にする

document.addEventListener('DOMContentLoaded', () => {
  const dateTarget = document.getElementById('display-date-target');

  if (dateTarget) {
    const today = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const date = today.getDate();
    const day = days[today.getDay()];

    const formattedDate = `${year}年${month}月${date}日 (${day})`;
    dateTarget.textContent = formattedDate;
  }
  loadReservations();
});

async function loadReservations() {
  try {
    // server.tsで作るAPIに合わせてパスを変更
    const response = await fetch(`${API_URL}/api/reservations`);
    if (!response.ok) throw new Error('データ取得に失敗しました');
    const data = await response.json();

    console.log('予約データ:', data);
    // ここにテーブルを書き換える処理を後で追加できます
  } catch (error) {
    console.error('データ取得エラー:', error);
  }
}
