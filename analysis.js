async function initAnalysis() {
  try {
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('サーバーからのデータ取得に失敗しました');

    const data = await response.json();
    console.log('取得した分析データ:', data);

    document.getElementById('tomorrow-date').textContent = data.tomorrow || '---';
    document.getElementById('adult-count').textContent = data.adults || 0;
    document.getElementById('kids-count').textContent = data.kids || 0;

    if (!data.chartData || data.chartData.length === 0) {
      console.warn('表示する商品データがありません');
      return;
    }

    const labels = data.chartData.map((d) => d['商品名'] || '不明な商品');
    const familyScores = data.chartData.map((d) => d.family_score || 0);
    const soloScores = data.chartData.map((d) => d.solo_score || 0);

    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (window.myRadarChart instanceof Chart) {
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
            borderWidth: 2,
            pointBackgroundColor: '#ff9933'
          },
          {
            label: 'お一人様人気度',
            data: soloScores,
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 2,
            pointBackgroundColor: 'rgb(54, 162, 235)'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { display: true },
            suggestedMin: 0,
            suggestedMax: 10,
            ticks: { stepSize: 2 }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 14 } }
          }
        }
      }
    });
  } catch (err) {
    console.error('分析画面の初期化中にエラーが発生しました:', err);

    const dateDisplay = document.querySelector('.date-display');
    if (dateDisplay) dateDisplay.innerHTML += ' <span style="color:red;">(データ読み込みエラー)</span>';
  }
}

document.addEventListener('DOMContentLoaded', initAnalysis);
