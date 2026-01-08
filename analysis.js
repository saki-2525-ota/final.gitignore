async function initAnalysis() {
  try {
    console.log('データ取得開始...');
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('APIに接続できません');
    const data = await response.json();
    console.log('受信データ:', data);

    // 予約状況
    document.getElementById('tomorrow-date').textContent = data.tomorrow || '不明';
    document.getElementById('adult-count').textContent = data.adults || 0;
    document.getElementById('kids-count').textContent = data.kids || 0;

    // グラフデータ
    if (!data.chartData || data.chartData.length === 0) {
      console.warn('グラフ用データが空です');
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
        scales: {
          r: { suggestedMin: 0, suggestedMax: 10 }
        }
      }
    });
  } catch (error) {
    console.error('読み込み失敗:', error);
  }
}

document.addEventListener('DOMContentLoaded', initAnalysis);
