async function initAnalysis() {
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('API request failed');
    const data = await response.json();

    // 予約状況（0でも表示）
    const dateEl = document.getElementById('tomorrow-date');
    if (dateEl) dateEl.textContent = data.tomorrow || '---';
    const adultEl = document.getElementById('adult-count');
    if (adultEl) adultEl.textContent = data.adults || 0;
    const kidsEl = document.getElementById('kids-count');
    if (kidsEl) kidsEl.textContent = data.kids || 0;

    // グラフ描画
    if (!data.chartData || data.chartData.length === 0) {
      console.log('表示する商品データがありません');
      return;
    }

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
            data: data.chartData.map((d) => d.family_score ?? 5),
            backgroundColor: 'rgba(255, 153, 51, 0.2)',
            borderColor: '#ff9933'
          },
          {
            label: 'お一人様人気度',
            data: data.chartData.map((d) => d.solo_score ?? 5),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          r: { suggestedMin: 0, suggestedMax: 10 }
        }
      }
    });
  } catch (error) {
    console.error('Error loading analysis:', error);
  }
}

document.addEventListener('DOMContentLoaded', initAnalysis);
