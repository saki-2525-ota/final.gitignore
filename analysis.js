const API_URL = 'https://final-git.saki-2525-ota.deno.net';

document.addEventListener('DOMContentLoaded', () => {
  initAnalysis();
});

async function initAnalysis() {
  try {
    const response = await fetch(`${API_URL}/api/analysis-data`);
    if (!response.ok) throw new Error('データ取得に失敗しました');

    const data = await response.json();

    if (document.getElementById('tomorrow-date')) {
      document.getElementById('tomorrow-date').textContent = data.tomorrow;
    }
    if (document.getElementById('adult-count')) {
      document.getElementById('adult-count').textContent = data.adults;
    }
    if (document.getElementById('kids-count')) {
      document.getElementById('kids-count').textContent = data.kids;
    }

    // 4. レーダーチャートの作成
    renderChart(data.chartData);
  } catch (error) {
    console.error('分析データの取得エラー:', error);
    alert('データの読み込みに失敗しました。Deno Deploy のログを確認してください。');
  }
}

function renderChart(chartData) {
  const ctx = document.getElementById('radarChart').getContext('2d');

  if (window.myRadarChart) {
    window.myRadarChart.destroy();
  }

  window.myRadarChart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: chartData.map((d) => d.商品名),
      datasets: [
        {
          label: 'ファミリー人気度',
          data: chartData.map((d) => d.family_score),
          backgroundColor: 'rgba(255, 153, 51, 0.2)',
          borderColor: '#ff9933',
          pointBackgroundColor: '#ff9933'
        },
        {
          label: 'お一人様人気度',
          data: chartData.map((d) => d.solo_score),
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgb(54, 162, 235)',
          pointBackgroundColor: 'rgb(54, 162, 235)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          suggestMin: 0,
          suggestMax: 10,
          ticks: { stepSize: 2 }
        }
      }
    }
  });
}
