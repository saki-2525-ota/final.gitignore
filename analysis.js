const API_URL = 'https://final-git.saki-2525-ota.deno.net';

async function initAnalysis() {
  try {
    const response = await fetch(`${API_URL}/api/analysis-data`);
    const data = await response.json();

    document.getElementById('tomorrow-date').textContent = data.tomorrow;
    document.getElementById('adult-count').textContent = data.adults;
    document.getElementById('kids-count').textContent = data.kids;

    const ctx = document.getElementById('radarChart').getContext('2d');
    new Chart(ctx, {
      type: 'radar',
      data: {
        labels: data.chartData.map((d) => d.商品名),
        datasets: [
          {
            label: 'ファミリー人気度',
            data: data.chartData.map((d) => d.family_score),
            backgroundColor: 'rgba(255, 153, 51, 0.2)',
            borderColor: '#ff9933'
          },
          {
            label: 'お一人様人気度',
            data: data.chartData.map((d) => d.solo_score),
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            borderColor: 'rgb(54, 162, 235)'
          }
        ]
      },
      options: { scales: { r: { suggestMin: 0, suggestMax: 10 } } }
    });
  } catch (error) {
    console.error('グラフの読み込み失敗:', error);
  }
}

initAnalysis();
