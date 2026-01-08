async function initAnalysis() {
  console.log('データ取得開始...');
  try {
    const response = await fetch('/api/analysis-data');
    const data = await response.json();
    console.log('受信データ:', data);

    // 予約状況の書き込み
    document.getElementById('tomorrow-date').textContent = data.tomorrow + ' の予約';
    document.getElementById('adult-count').textContent = data.adults;
    document.getElementById('kids-count').textContent = data.kids;

    // グラフ描画
    const ctx = document.getElementById('radarChart').getContext('2d');
    if (window.myRadarChart) window.myRadarChart.destroy();

    window.myRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.chartData.map((d) => d['商品名']),
        datasets: [
          {
            label: 'ファミリー人気',
            data: data.chartData.map((d) => d.family_score),
            backgroundColor: 'rgba(255, 153, 51, 0.4)',
            borderColor: '#ff9933'
          },
          {
            label: 'お一人様人気',
            data: data.chartData.map((d) => d.solo_score),
            backgroundColor: 'rgba(54, 162, 235, 0.4)',
            borderColor: 'rgb(54, 162, 235)'
          }
        ]
      },
      options: { scales: { r: { suggestedMin: 0, suggestedMax: 10 } } }
    });
  } catch (err) {
    console.error('グラフ表示エラー:', err);
  }
}
document.addEventListener('DOMContentLoaded', initAnalysis);
