async function initAnalysis() {
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('データ取得失敗');

    const data = await response.json();
    console.log('受信データ:', data);

    document.getElementById('tomorrow-date').textContent = data.tomorrow || '---';
    document.getElementById('adult-count').textContent = data.adults || 0;
    document.getElementById('kids-count').textContent = data.kids || 0;

    if (!data.chartData || data.chartData.length === 0) {
      console.warn('表示する商品データがありません。DBを確認してください。');
      return;
    }

    const labels = data.chartData.map((d) => d['商品名']);
    const familyScores = data.chartData.map((d) => d.family_score ?? 5);
    const soloScores = data.chartData.map((d) => d.solo_score ?? 5);

    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (window.myRadarChart) {
      window.myRadarChart.destroy();
    }

    window.myRadarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'ファミリー人気度',
            data: familyScores,
            backgroundColor: 'rgba(255, 153, 51, 0.2)',
            borderColor: '#ff9933',
            borderWidth: 2
          },
          {
            label: 'お一人様人気度',
            data: soloScores,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            suggestedMin: 0,
            suggestedMax: 10
          }
        }
      }
    });
  } catch (err) {
    console.error('グラフ表示エラー:', err);
  }
}

document.addEventListener('DOMContentLoaded', initAnalysis);
