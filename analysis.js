async function initAnalysis() {
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('Network error');
    const data = await response.json();

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
            borderColor: '#ff9933',
            fill: true
          },
          {
            label: 'お一人様人気度',
            data: data.chartData.map((d) => d.solo_score),
            backgroundColor: 'rgba(54, 162, 235, 0.4)', // 青
            borderColor: 'rgb(54, 162, 235)',
            fill: true
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
    console.error('Analysis JS Error:', err);
  }
}
document.addEventListener('DOMContentLoaded', initAnalysis);
