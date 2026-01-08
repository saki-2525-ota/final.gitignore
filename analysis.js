async function initAnalysis() {
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('データ取得失敗');
    const data = await response.json();

    // 予約状況の表示
    document.getElementById('tomorrow-date').textContent = data.tomorrow || '---';
    document.getElementById('adult-count').textContent = data.adults || 0;
    document.getElementById('kids-count').textContent = data.kids || 0;

    // グラフの描画
    if (!data.chartData || data.chartData.length === 0) return;

    const ctx = document.getElementById('radarChart').getContext('2d');

    // 既存のグラフがあれば破棄
    if (window.myRadarChart) {
      window.myRadarChart.destroy();
    }

    window.myRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.chartData.map((d) => d['商品名']),
        datasets: [
          {
            label: 'ファミリー人気度',
            data: data.chartData.map((d) => d.family_score ?? 5), // NULLなら5にする
            backgroundColor: 'rgba(255, 153, 51, 0.2)',
            borderColor: '#ff9933'
          },
          {
            label: 'お一人様人気度',
            data: data.chartData.map((d) => d.solo_score ?? 5), // NULLなら5にする
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)'
          }
        ]
      },
      options: {
        scales: {
          r: { suggestedMin: 0, suggestedMax: 10 }
        }
      }
    });
  } catch (err) {
    console.error('グラフの読み込みエラー:', err);
  }
}

document.addEventListener('DOMContentLoaded', initAnalysis);
