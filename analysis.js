async function initAnalysis() {
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('データ取得に失敗しました');
    const data = await response.json();

    // 1. 予約人数の更新
    document.getElementById('tomorrow-date').textContent = data.tomorrow || '---';
    document.getElementById('adult-count').textContent = data.adults || 0;
    document.getElementById('kids-count').textContent = data.kids || 0;

    // 2. グラフ描画
    if (!data.chartData || data.chartData.length === 0) {
      console.error('グラフ用のデータが空です');
      return;
    }

    const ctx = document.getElementById('radarChart').getContext('2d');
    if (window.myRadarChart) window.myRadarChart.destroy();

    window.myRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.chartData.map((d) => d['商品名']),
        datasets: [
          {
            label: 'ファミリー人気度',
            data: data.chartData.map((d) => d.family_score),
            backgroundColor: 'rgba(255, 153, 51, 0.4)',
            borderColor: '#ff9933',
            fill: true
          },
          {
            label: 'お一人様人気度',
            data: data.chartData.map((d) => d.solo_score),
            backgroundColor: 'rgba(54, 162, 235, 0.4)',
            borderColor: 'rgb(54, 162, 235)',
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { r: { suggestedMin: 0, suggestedMax: 10 } }
      }
    });
  } catch (err) {
    console.error('Analysis Error:', err);
  }
}
document.addEventListener('DOMContentLoaded', initAnalysis);
