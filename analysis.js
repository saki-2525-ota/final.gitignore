async function initAnalysis() {
  try {
    // 1. サーバーからデータを取得
    const response = await fetch('/api/analysis-data');
    if (!response.ok) throw new Error('サーバーとの通信に失敗しました');
    const data = await response.json();

    // 2. 予約人数の表示（予約がなくても0を表示）
    document.getElementById('tomorrow-date').textContent = data.tomorrow || '---';
    document.getElementById('adult-count').textContent = data.adults || 0;
    document.getElementById('kids-count').textContent = data.kids || 0;

    // 3. グラフデータの準備
    // chartDataが空（0件）の場合は、ここで「データなし」と表示して終了
    if (!data.chartData || data.chartData.length === 0) {
      console.warn('表示できる商品スコアがありません。');
      return;
    }

    // 商品名、ファミリースコア、お一人様スコアを抽出
    const labels = data.chartData.map((d) => d['商品名']);
    const familyScores = data.chartData.map((d) => d.family_score ?? 5); // スコアがない場合は5にする
    const soloScores = data.chartData.map((d) => d.solo_score ?? 5);

    // 4. レーダーチャートの描画
    const ctx = document.getElementById('radarChart').getContext('2d');

    // すでにグラフがある場合は一度壊して再描画（二重描画防止）
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
            backgroundColor: 'rgba(255, 153, 51, 0.2)', // オレンジ色
            borderColor: '#ff9933',
            borderWidth: 2,
            pointBackgroundColor: '#ff9933'
          },
          {
            label: 'お一人様人気度',
            data: soloScores,
            backgroundColor: 'rgba(54, 162, 235, 0.2)', // 青色
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
            suggestedMax: 10, // 10点満点のグラフにする
            ticks: { stepSize: 2 }
          }
        },
        plugins: {
          legend: { position: 'top' }
        }
      }
    });
  } catch (error) {
    console.error('分析画面の読み込み中にエラーが発生しました:', error);
  }
}

// ページが読み込まれたら実行
document.addEventListener('DOMContentLoaded', initAnalysis);
