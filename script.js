let chart = null;

function normalPDF(x, mean, stddev) {
  const exponent = -0.5 * Math.pow((x - mean) / stddev, 2);
  return (1 / (stddev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

function normalCDF(x, mean, stddev) {
  return 0.5 * (1 + erf((x - mean) / (stddev * Math.sqrt(2))));
}

function erf(x) {
  // Approximation for erf (Abramowitz and Stegun formula 7.1.26)
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

function getGrade(score) {
  if (score >= 95) return "A+";
  if (score >= 90) return "A";
  if (score >= 85) return "B+";
  if (score >= 80) return "B";
  if (score >= 75) return "C+";
  if (score >= 70) return "C";
  return "D or lower";
}

function getGradeBands() {
  return [
    { min: 95, max: 100, color: "rgba(37,99,235,0.2)" },   // A+
    { min: 90, max: 94,  color: "rgba(56,189,248,0.2)" },  // A
    { min: 85, max: 89,  color: "rgba(22,163,74,0.2)" },   // B+
    { min: 80, max: 84,  color: "rgba(132,204,22,0.2)" },  // B
    { min: 75, max: 79,  color: "rgba(234,179,8,0.2)" },   // C+
    { min: 70, max: 74,  color: "rgba(249,115,22,0.2)" },  // C
    { min: 0,  max: 69,  color: "rgba(220,38,38,0.2)" },   // D~
  ];
}

function drawChart(mean, stddev, score) {
  const ctx = document.getElementById("chartCanvas").getContext("2d");

  const xValues = [];
  const yValues = [];

  for (let x = mean - 4 * stddev; x <= mean + 4 * stddev; x += 0.1) {
    xValues.push(x);
    yValues.push(normalPDF(x, mean, stddev));
  }

  const bandPlugin = {
    id: 'gradeBands',
    beforeDatasetsDraw(chart) {
      const { ctx, chartArea: { left, right, top, bottom }, scales: { x } } = chart;
      getGradeBands().forEach(band => {
        ctx.fillStyle = band.color;
        ctx.fillRect(x.getPixelForValue(band.min), top, x.getPixelForValue(band.max) - x.getPixelForValue(band.min), bottom - top);
      });
    }
  };

  const scoreLinePlugin = {
    id: 'scoreLine',
    afterDatasetsDraw(chart) {
      const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
      const xPos = x.getPixelForValue(score);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xPos, top);
      ctx.lineTo(xPos, bottom);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  };

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xValues,
      datasets: [{
        label: 'Normal Distribution',
        data: yValues,
        borderColor: '#3b82f6',
        borderWidth: 2,
        fill: false,
        pointRadius: 0,
      }]
    },
    options: {
      responsive: true, // Chart.js 공식문서에 따라 반응형 옵션 활성화
      scales: {
        x: {
          title: {
            display: true,
            text: 'Score'
          },
          // x축 라벨을 소수점 3자리까지 표시 (Chart.js 공식문서 ticks.callback 참고)
          ticks: {
            callback: function(value, index, values) {
              // value는 실제 x축 값
              return Number(value).toFixed(3); // 소수점 3자리까지 표시
            }
          }
        },
        y: {
          display: false
        }
      },
      plugins: {
        legend: { display: false }
      }
    },
    plugins: [bandPlugin, scoreLinePlugin]
  });
}

// 학점 구간별 경계값과 상위 백분율을 계산하여 표로 출력하는 함수 추가
function renderGradeTable(mean, stddev, population) {
  // 학점 구간 정보 가져오기
  const bands = getGradeBands();
  let html = `<table class="min-w-full mt-6 border text-center text-sm">
    <thead class="bg-blue-100">
      <tr>
        <th class="border px-2 py-1">학점</th>
        <th class="border px-2 py-1">경계 점수</th>
        <th class="border px-2 py-1">상위 백분율(%)</th>
      </tr>
    </thead>
    <tbody>`;
  bands.forEach(band => {
    // 각 구간의 최소 점수에 대한 상위 백분율 계산
    const percentile = 1 - normalCDF(band.min, mean, stddev);
    // 소수점 3자리까지 절삭
    const percentileDisplay = Math.floor(percentile * 100000) / 1000;
    html += `<tr>
      <td class="border px-2 py-1">${getGrade(band.min)}</td>
      <td class="border px-2 py-1">${band.min}</td>
      <td class="border px-2 py-1">${percentileDisplay}</td>
    </tr>`;
  });
  html += `</tbody></table>`;
  // 표를 grade-table div에 삽입
  document.getElementById("grade-table").innerHTML = html;
}

function calculateAndDraw() {
  const mean = parseFloat(document.getElementById("mean").value);
  const stddev = parseFloat(document.getElementById("stddev").value);
  const population = parseInt(document.getElementById("population").value);
  const score = parseFloat(document.getElementById("score").value);

  // 입력값 유효성 검사 추가 (음수, 0 등 비정상 입력 방지)
  if (
    isNaN(mean) || isNaN(stddev) || isNaN(population) || isNaN(score) ||
    stddev <= 0 || population <= 0
  ) {
    alert("모든 값을 올바르게 입력해 주세요. (표준편차와 인원수는 0보다 커야 합니다)");
    return;
  }

  const percentile = 1 - normalCDF(score, mean, stddev);
  // 소수점 3자리까지 절삭 (Math.floor 사용)
  const percentileDisplay = Math.floor(percentile * 100000) / 1000;
  const rank = Math.ceil(percentile * population);
  drawChart(mean, stddev, score);
  const grade = getGrade(score);

  // 결과 안내문구 한국어로 변경 및 소수점 3자리까지 표시
  document.getElementById("result").innerHTML = `
    🎯 내 점수는 상위 <strong>${percentileDisplay}%</strong>에 해당합니다.<br/>
    📊 예상 등수: <strong>${rank}</strong> / ${population}명 중<br/>
    🏅 예상 학점: <strong class="text-blue-600">${grade}</strong>
  `;

  // 학점 구간별 표 렌더링 함수 호출
  renderGradeTable(mean, stddev, population);
}
