async function initAnalysis() {
  console.log('データ取得開始...');
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('データ取得に失敗しました');
    const data = await response.json();
    console.log('受信データ:', data);

    // 予約状況（大人・子供の人数）の更新
    const dateElem = document.getElementById('tomorrow-date');
    const adultElem = document.getElementById('adult-count');
    const kidsElem = document.getElementById('kids-count');

    if (dateElem) dateElem.textContent = data.tomorrow + ' の予約';
    if (adultElem) adultElem.textContent = data.adults;
    if (kidsElem) kidsElem.textContent = data.kids;
  } catch (err) {
    console.error('分析データ表示エラー:', err);
  }
}

document.addEventListener('DOMContentLoaded', initAnalysis);
