let chart = null;
// localStorage 키 정의 (주석: 설정 저장을 위한 고유 키)
const LS_SETTINGS_KEY = 'gradeCalculatorSettings_v1'; // 버전 명시하여 추후 호환성 관리 용이 (주석)

// 기본 학점 구간 정의 (주석: 초기값 또는 저장된 설정 없을 시 사용)
const defaultGradeBands = [
    // 점수 높은 순으로 정렬 (주석)
    { grade: "A+", min: 95, max: 100, color: "rgba(37,99,235,0.2)" },
    { grade: "A", min: 90, max: 94.99, color: "rgba(56,189,248,0.2)" }, // 최대값 조정하여 경계 명확화 (주석)
    { grade: "B+", min: 85, max: 89.99, color: "rgba(22,163,74,0.2)" },
    { grade: "B", min: 80, max: 84.99, color: "rgba(132,204,22,0.2)" },
    { grade: "C+", min: 75, max: 79.99, color: "rgba(234,179,8,0.2)" },
    { grade: "C", min: 70, max: 74.99, color: "rgba(249,115,22,0.2)" },
    { grade: "D or lower", min: 0, max: 69.99, color: "rgba(220,38,38,0.2)" }
];

// localStorage에서 설정 불러오기 함수 (주석)
function loadSettings() {
    try { // localStorage 접근 오류 처리 (주석: 프라이빗 브라우징 등)
        const savedSettings = localStorage.getItem(LS_SETTINGS_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            // 저장된 입력값 복원 (주석)
            document.getElementById("mean").value = settings.mean || '';
            document.getElementById("stddev").value = settings.stddev || '';
            document.getElementById("population").value = settings.population || '';
            document.getElementById("score").value = settings.score || '';
            // 저장된 학점 구간이 있으면 사용, 없으면 기본값 사용 (주석)
            renderGradeBandEditor(settings.gradeBands && settings.gradeBands.length > 0 ? settings.gradeBands : defaultGradeBands);
        } else {
            // 저장된 설정 없으면 기본 학점 구간으로 에디터 렌더링 (주석)
            renderGradeBandEditor(defaultGradeBands);
        }
    } catch (e) {
        console.error("localStorage 접근 중 오류 발생:", e); // 오류 로깅 (주석)
        alert("설정을 불러오는 중 오류가 발생했습니다. 브라우저 설정을 확인해주세요.");
        renderGradeBandEditor(defaultGradeBands); // 오류 시 기본값으로 렌더링 (주석)
    }
}

// localStorage에 설정 저장하기 함수 (주석)
function saveSettings() {
    try { // localStorage 접근 오류 처리 (주석)
        const currentGradeBands = getGradeBandsFromEditor(); // 에디터에서 현재 학점 구간 가져오기 (주석)
        const settings = {
            mean: document.getElementById("mean").value,
            stddev: document.getElementById("stddev").value,
            population: document.getElementById("population").value,
            score: document.getElementById("score").value,
            gradeBands: currentGradeBands
        };
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("localStorage 저장 중 오류 발생:", e); // 오류 로깅 (주석)
        alert("설정을 저장하는 중 오류가 발생했습니다. 브라우저 저장 공간이 부족하거나 설정을 확인해주세요.");
    }
}

// 학점 구간 에디터 UI 렌더링 함수 (주석)
function renderGradeBandEditor(bands) {
    const editorDiv = document.getElementById("grade-bands-editor");
    if (!editorDiv) return; // editorDiv 없으면 종료 (주석)
    editorDiv.innerHTML = ''; // 기존 내용 초기화 (주석)
    bands.sort((a, b) => b.min - a.min).forEach((band, index) => {
        editorDiv.appendChild(createGradeBandRow(band, index, bands.length));
    });
    editorDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', saveSettings);
    });
}

// 학점 구간 입력 행 생성 함수 (주석)
function createGradeBandRow(band, index, totalRows) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-4 gap-2 items-center grade-band-row'; // 행 식별 클래스 추가 (주석)
    row.dataset.index = index; // 데이터 속성으로 인덱스 저장 (주석)
    row.innerHTML = `
        <input type="text" placeholder="학점명 (예: A+)" value="${band.grade || ''}" class="input grade-band-grade" aria-label="학점명 ${index + 1}">
        <input type="number" step="0.01" placeholder="최소 점수" value="${band.min}" class="input grade-band-min" aria-label="최소 점수 ${index + 1}">
        <input type="number" step="0.01" placeholder="최대 점수" value="${band.max}" class="input grade-band-max" aria-label="최대 점수 ${index + 1}">
        <button onclick="removeGradeBandRow(this)" class="text-red-500 hover:text-red-700 text-sm" aria-label="${index + 1}번째 구간 삭제">삭제</button>
    `;
    return row;
}

// 학점 구간 입력 행 추가 함수 (주석)
function addGradeBandRow() {
    const bands = getGradeBandsFromEditor();
    const lowestMin = bands.length > 0 ? bands[bands.length - 1].min : 0;
    bands.push({ grade: "", min: Math.max(0, lowestMin - 10), max: Math.max(0, lowestMin - 0.01), color: "rgba(128,128,128,0.2)" });
    renderGradeBandEditor(bands);
    saveSettings();
}

// 학점 구간 입력 행 삭제 함수 (주석: 버튼 요소에서 호출)
function removeGradeBandRow(buttonElement) {
    const rowToRemove = buttonElement.closest('.grade-band-row');
    if (rowToRemove) {
        rowToRemove.remove();
        saveSettings();
    }
}

// 에디터 UI에서 현재 학점 구간 데이터 가져오는 함수 (주석)
function getGradeBandsFromEditor() {
    const editorDiv = document.getElementById("grade-bands-editor");
    if (!editorDiv) return [];
    const rows = editorDiv.querySelectorAll('.grade-band-row');
    const bands = [];
    const defaultColors = defaultGradeBands.map(b => b.color);

    for (let i = 0; i < rows.length; i++) {
        const gradeInput = rows[i].querySelector('.grade-band-grade');
        const minInput = rows[i].querySelector('.grade-band-min');
        const maxInput = rows[i].querySelector('.grade-band-max');

        const grade = gradeInput.value.trim();
        const min = parseFloat(minInput.value);
        const max = parseFloat(maxInput.value);

        if (grade && !isNaN(min) && !isNaN(max) && min <= max) {
            bands.push({
                grade: grade,
                min: min,
                max: max,
                color: defaultColors[i] || "rgba(128,128,128,0.2)"
            });
        } else {
            console.warn(`학점 구간 ${i + 1}의 입력값이 유효하지 않습니다:`, { grade, min, max });
        }
    }
    bands.sort((a, b) => b.min - a.min);
    return bands;
}

// 기존 getGradeBands 함수를 에디터 값 사용하도록 수정 (주석)
function getGradeBands() {
    return getGradeBandsFromEditor();
}

// 기존 getGrade 함수를 커스텀 구간 사용하도록 수정 (주석)
function getGrade(score) {
    const bands = getGradeBands();
    for (const band of bands) {
        if (score >= band.min && score <= band.max) {
            return band.grade;
        }
    }
    if (bands.length > 0 && score < bands[bands.length - 1].min) {
        return bands[bands.length - 1].grade;
    }
    return "N/A";
}

// 페이지 로드 시 설정 불러오기 (주석)
document.addEventListener('DOMContentLoaded', loadSettings);

function normalPDF(x, mean, stddev) {
  const exponent = -0.5 * Math.pow((x - mean) / stddev, 2);
  return (1 / (stddev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

function normalCDF(x, mean, stddev) {
  return 0.5 * (1 + erf((x - mean) / (stddev * Math.sqrt(2))));
}

function erf(x) {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-x * x);
  return sign * y;
}

// drawChart 함수 수정 (주석: y축 표시 및 제목 설정)
function drawChart(mean, stddev, score) {
    const ctx = document.getElementById("chartCanvas").getContext("2d");
    const currentBands = getGradeBands();
    const userPercentile = (1 - normalCDF(score, mean, stddev)) * 100;

    const xPercentiles = [];
    const yDensityValues = [];

    const xMinScore = Math.max(0, mean - 5 * stddev);
    const xMaxScore = Math.max(100, mean + 5 * stddev);
    const scoreStep = (xMaxScore - xMinScore) / 500;

    xPercentiles.length = 0;
    yDensityValues.length = 0;

    for (let currentScore = xMinScore; currentScore <= xMaxScore; currentScore += scoreStep) {
        const percentile = (1 - normalCDF(currentScore, mean, stddev)) * 100;
        const density = normalPDF(currentScore, mean, stddev);

        xPercentiles.push(percentile);
        yDensityValues.push(density);
    }

    const points = xPercentiles.map((p, i) => ({ x: p, y: yDensityValues[i] }));
    points.sort((a, b) => a.x - b.x);

    xPercentiles.length = 0;
    yDensityValues.length = 0;
    points.forEach(p => {
        xPercentiles.push(p.x);
        yDensityValues.push(p.y);
    });

    const bandPlugin = {
        id: 'gradeBandsPercentile',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            currentBands.forEach(band => {
                const minPercentile = (1 - normalCDF(band.max, mean, stddev)) * 100;
                const maxPercentile = (1 - normalCDF(band.min, mean, stddev)) * 100;

                ctx.fillStyle = band.color;
                const xMinPixel = x.getPixelForValue(minPercentile);
                const xMaxPixel = x.getPixelForValue(maxPercentile);
                const chartLeft = x.left;
                const chartRight = x.right;

                const startPixel = Math.max(xMinPixel, chartLeft);
                const endPixel = Math.min(xMaxPixel, chartRight);
                const width = Math.max(0, endPixel - startPixel);

                if (width > 0) {
                    ctx.fillRect(startPixel, top, width, bottom - top);
                }
            });
        }
    };

    const scoreLinePlugin = {
        id: 'userPercentileLine',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(userPercentile);
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText(`${userPercentile.toFixed(3)}%`, xPos, top - 5);
            ctx.restore();
        }
    };

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: xPercentiles,
            datasets: [{
                label: '상대적 인원 밀도',
                data: yDensityValues,
                borderColor: '#3b82f6',
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: '상위 백분율 (%)'
                    },
                    min: 0,
                    max: 100,
                    reverse: false,
                    ticks: {
                        callback: function (value, index, values) {
                            return `${Number(value).toFixed(1)}%`;
                        },
                        stepSize: 10
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '상대적 인원 밀도'
                    },
                    ticks: {
                        maxTicksLimit: 6
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function (tooltipItems) {
                            const percentile = tooltipItems[0].parsed.x;
                            return `상위 ${percentile.toFixed(3)}%`;
                        },
                        label: function (tooltipItem) {
                            const density = tooltipItem.parsed.y;
                            return `밀도: ${density.toFixed(5)}`;
                        }
                    }
                }
            }
        },
        plugins: [bandPlugin, scoreLinePlugin]
    });
}

function renderGradeTable(mean, stddev, population) {
    const bands = getGradeBands();
    const tableContainer = document.getElementById("grade-table");
    if (!tableContainer) return;

    let html = `<h3 class="text-lg font-semibold mb-1">학점 구간별 정보</h3>`;
    html += `<table class=\"min-w-full border text-center text-sm\">\n    <thead class=\"bg-blue-100\">\n      <tr>\n        <th class=\"border px-2 py-1\">학점</th>\n        <th class=\"border px-2 py-1\">최소 점수</th>\n        <th class=\"border px-2 py-1\">최대 점수</th>\n        <th class=\"border px-2 py-1\">상위 백분율(%)</th>\n      </tr>\n    </thead>\n    <tbody>`;

    bands.forEach(band => {
        const percentile = 1 - normalCDF(band.min, mean, stddev);
        const percentileDisplay = Math.floor(percentile * 100000) / 1000;
        html += `<tr>\n      <td class=\"border px-2 py-1\">${band.grade}</td>\n      <td class=\"border px-2 py-1\">${band.min.toFixed(2)}</td>\n      <td class=\"border px-2 py-1\">${band.max.toFixed(2)}</td>\n      <td class=\"border px-2 py-1\">${percentileDisplay}</td>\n    </tr>`;
    });
    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
}

function calculateAndDraw() {
    const meanInput = document.getElementById("mean");
    const stddevInput = document.getElementById("stddev");
    const populationInput = document.getElementById("population");
    const scoreInput = document.getElementById("score");

    const mean = parseFloat(meanInput.value);
    const stddev = parseFloat(stddevInput.value);
    const population = parseInt(populationInput.value);
    const score = parseFloat(scoreInput.value);

    let isValid = true;
    [meanInput, stddevInput, populationInput, scoreInput].forEach(input => input.classList.remove('border-red-500'));

    if (isNaN(mean)) { meanInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(stddev) || stddev <= 0) { stddevInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(population) || population <= 0) { populationInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(score)) { scoreInput.classList.add('border-red-500'); isValid = false; }

    const currentBands = getGradeBands();
    if (!currentBands || currentBands.length === 0) {
        alert("학점 구간을 하나 이상 설정해주세요.");
        isValid = false;
        document.getElementById('grade-bands-editor').classList.add('border', 'border-red-500');
    } else {
        document.getElementById('grade-bands-editor').classList.remove('border', 'border-red-500');
    }

    if (!isValid) {
        alert("입력값을 확인해주세요. 빨간색 테두리 항목을 수정해야 합니다.");
        return;
    }

    saveSettings();

    const percentile = 1 - normalCDF(score, mean, stddev);
    const percentileDisplay = Math.floor(percentile * 100000) / 1000;
    const rank = Math.max(1, Math.ceil(percentile * population));
    const grade = getGrade(score);

    document.getElementById("result").innerHTML = `
    🎯 내 점수는 상위 <strong>${percentileDisplay}%</strong>에 해당합니다.<br/>
    📊 예상 등수: <strong>${rank}</strong> / ${population}명 중<br/>
    🏅 예상 학점: <strong class=\"text-blue-600\">${grade !== "N/A" ? grade : "구간 없음"}</strong>
  `;

    drawChart(mean, stddev, score);
    renderGradeTable(mean, stddev, population);
}
