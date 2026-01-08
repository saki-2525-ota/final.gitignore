async function initAnalysis() {
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('データ取得に失敗しました');
    const data = await response.json();

    // 予約状況の反映
    const dateEl = document.getElementById('tomorrow-date');
    if (dateEl) dateEl.textContent = data.tomorrow || '---';
    const adultEl = document.getElementById('adult-count');
    if (adultEl) adultEl.textContent = data.adults || 0;
    const kidsEl = document.getElementById('kids-count');
    if (kidsEl) kidsEl.textContent = data.kids || 0;

    if (!data.chartData || data.chartData.length === 0) {
      console.warn('表示するグラフデータがありません');
      return;
    }

    // グラフ描画
    const ctx = document.getElementById('radarChart').getContext('2d');

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
            data: data.chartData.map((d) => d.family_score),
            backgroundColor: 'rgba(255, 153, 51, 0.4)', // オレンジ
            borderColor: 'rgba(255, 153, 51, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(255, 153, 51, 1)'
          },
          {
            label: 'お一人様人気度',
            data: data.chartData.map((d) => d.solo_score),
            backgroundColor: 'rgba(54, 162, 235, 0.4)', // 青
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 10,
            ticks: { stepSize: 2, backdropColor: 'transparent' },
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
            pointLabels: { font: { size: 12 } }
          }
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  } catch (err) {
    console.error('表示エラー:', err);
  }
}

document.addEventListener('DOMContentLoaded', initAnalysis);
