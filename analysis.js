async function initAnalysis() {
  console.log('分析開始...');
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('APIに接続できません');
    const data = await response.json();
    console.log('受信データ:', data);

    // 数値の表示
    document.getElementById('tomorrow-date').textContent = data.tomorrow;
    document.getElementById('adult-count').textContent = data.adults;
    document.getElementById('kids-count').textContent = data.kids;

    // グラフの準備
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
            borderColor: '#ff9933'
          },
          {
            label: 'お一人様人気度',
            data: data.chartData.map((d) => d.solo_score),
            backgroundColor: 'rgba(54, 162, 235, 0.4)',
            borderColor: 'rgb(54, 162, 235)'
          }
        ]
      },
      options: {
        scales: { r: { suggestedMin: 0, suggestedMax: 10 } }
      }
    });
  } catch (err) {
    console.error('エラー:', err);
  }
}
document.addEventListener('DOMContentLoaded', initAnalysis);
