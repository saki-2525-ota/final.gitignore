async function loadReservations() {
  try {
    const response = await fetch('/api/reservations');
    if (!response.ok) return;

    const data = await response.json();
    console.log('予約データ:', data);
  } catch (error) {
    console.error('データ取得エラー:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const dateTarget = document.getElementById('display-date-target');

  if (dateTarget) {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const days = ['日', '月', '火', '水', '木', '金', '土'];

    const year = tomorrow.getFullYear();
    const month = tomorrow.getMonth() + 1;
    const date = tomorrow.getDate();
    const day = days[tomorrow.getDay()];

    const formattedDate = `${year}年${month}月${date}日 (${day})`;

    dateTarget.textContent = formattedDate;
  }

  loadReservations();
});
