let chart = null;
let lastChartData = null; // 전역 변수로 차트 설정 저장
let showChartType = 'score'; // 기본 차트 타입: score | percentile

// localStorage 키 정의 (주석: 설정 저장을 위한 고유 키)
const LS_SETTINGS_KEY = 'gradeCalculatorSettings_v1'; // 버전 명시하여 추후 호환성 관리 용이

// 기본 학점 구간 정의 (주석: 초기값 또는 저장된 설정 없을 시 사용)
const defaultGradeBands = [
    // A학점 30% (A+ 10%, A0 20%), B학점 40% (B+ 20%, B0 20%), C학점 이하 30% (C+ 15%, C0 10%, D 이하 5%)
    { grade: "A+", min: 90, max: 100, color: "rgba(37,99,235,0.2)" }, // A+ 구간
    { grade: "A0", min: 80, max: 89.99, color: "rgba(56,189,248,0.2)" }, // A0 구간
    { grade: "B+", min: 60, max: 79.99, color: "rgba(22,163,74,0.2)" }, // B+ 구간
    { grade: "B0", min: 40, max: 59.99, color: "rgba(132,204,22,0.2)" }, // B0 구간
    { grade: "C+", min: 25, max: 39.99, color: "rgba(234,179,8,0.2)" }, // C+ 구간
    { grade: "C0", min: 15, max: 24.99, color: "rgba(249,115,22,0.2)" }, // C0 구간
    { grade: "D or lower", min: 0, max: 14.99, color: "rgba(220,38,38,0.2)" }  // D 이하 구간
];

// localStorage에서 설정 불러오기 함수
function loadSettings() {
    try { // localStorage 접근 오류 처리 (주석: 프라이빗 브라우징 등)
        const savedSettings = localStorage.getItem(LS_SETTINGS_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            // 저장된 입력값 복원
            document.getElementById("mean").value = settings.mean || '';
            document.getElementById("stddev").value = settings.stddev || '';
            document.getElementById("population").value = settings.population || '';
            document.getElementById("score").value = settings.score || '';
            // 저장된 학점 구간이 있으면 사용, 없으면 기본값 사용
            renderGradeBandEditor(settings.gradeBands && settings.gradeBands.length > 0 ? settings.gradeBands : defaultGradeBands);
        } else {
            // 저장된 설정 없으면 기본 학점 구간으로 에디터 렌더링
            renderGradeBandEditor(defaultGradeBands);
        }
    } catch (e) {
        console.error("localStorage 접근 중 오류 발생:", e); // 오류 로깅
        alert("설정을 불러오는 중 오류가 발생했습니다. 브라우저 설정을 확인해주세요.");
        renderGradeBandEditor(defaultGradeBands); // 오류 시 기본값으로 렌더링
    }
}

// localStorage에 설정 저장하기 함수
function saveSettings() {
    try { // localStorage 접근 오류 처리
        const currentGradeBands = getGradeBandsFromEditor(); // 에디터에서 현재 학점 구간 가져오기
        const settings = {
            mean: document.getElementById("mean").value,
            stddev: document.getElementById("stddev").value,
            population: document.getElementById("population").value,
            score: document.getElementById("score").value,
            gradeBands: currentGradeBands
        };
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("localStorage 저장 중 오류 발생:", e); // 오류 로깅
        alert("설정을 저장하는 중 오류가 발생했습니다. 브라우저 저장 공간이 부족하거나 설정을 확인해주세요.");
    }
}

// localStorage와 입력값을 초기화하는 함수 (주석: 새로 추가)
function resetAllData() {
    if (confirm('모든 설정과 입력값이 초기화됩니다. 계속하시겠습니까?')) {
        // localStorage 초기화
        localStorage.removeItem('gradeBands');
        localStorage.removeItem('lastInputs');

        // 입력값 초기화
        document.getElementById('mean').value = '';
        document.getElementById('stddev').value = '';
        document.getElementById('population').value = '';
        document.getElementById('score').value = '';

        // 차트 초기화
        const ctx = document.getElementById('chartCanvas').getContext('2d');
        if (window.myChart) {
            window.myChart.destroy();
        }

        // 결과 텍스트 초기화
        document.getElementById('result').innerHTML = '';
        document.getElementById('grade-table').innerHTML = '';

        // 학점 구간 에디터 초기화
        renderGradeBandEditor(defaultGradeBands);
    }
}

// 입력값만 초기화하는 함수 (주석: 설정은 유지)
function clearInputValues() {
    // 입력 필드 초기화
    document.getElementById('mean').value = '';
    document.getElementById('stddev').value = '';
    document.getElementById('population').value = '';
    document.getElementById('score').value = '';

    // 결과 영역 초기화
    document.getElementById('result').innerHTML = '';

    // 차트 초기화
    if (window.myChart) {
        window.myChart.destroy();
        window.myChart = null;
    }

    // 학점 구간별 정보 테이블 초기화
    document.getElementById('grade-table').innerHTML = '';
}

// 학점 구간 에디터 UI 렌더링 함수
function renderGradeBandEditor(bands) {
    const editorDiv = document.getElementById("grade-bands-editor");
    if (!editorDiv) return; // editorDiv 없으면 종료
    editorDiv.innerHTML = ''; // 기존 내용 초기화
    bands.sort((a, b) => b.min - a.min).forEach((band, index) => {
        editorDiv.appendChild(createGradeBandRow(band, index, bands.length));
    });
    editorDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', saveSettings);
    });
}

// 학점 구간 입력 행 생성 함수
function createGradeBandRow(band, index, totalRows) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-4 gap-2 items-center grade-band-row';
    row.dataset.index = index;

    row.innerHTML = `
        <input type="text" placeholder="학점명 (예: A+)" value="${band.grade || ''}" 
            class="input grade-band-grade" data-type="grade" aria-label="학점명 ${index + 1}">
        <input type="number" step="0.01" placeholder="최소 점수" value="${band.min}" 
            class="input grade-band-min" data-type="min" aria-label="최소 점수 ${index + 1}">
        <div class="flex justify-between">
            <button onclick="moveGradeBand(${index}, 'up')" class="text-blue-500 hover:text-blue-700 px-2" 
                ${index === 0 ? 'disabled' : ''} aria-label="위로 이동">↑</button>
            <button onclick="moveGradeBand(${index}, 'down')" class="text-blue-500 hover:text-blue-700 px-2" 
                ${index === totalRows - 1 ? 'disabled' : ''} aria-label="아래로 이동">↓</button>
        </div>
        <button onclick="removeGradeBandRow(this)" class="text-red-500 hover:text-red-700" 
            aria-label="${index + 1}번째 구간 삭제">삭제</button>
    `;

    // 탭 키 네비게이션 순서 설정
    setupTabNavigation(row);

    return row;
}

// 탭 키 네비게이션 설정 함수
function setupTabNavigation(row) {
    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const type = input.dataset.type;
                const allGrades = [...document.querySelectorAll('.grade-band-grade')];
                const allMins = [...document.querySelectorAll('.grade-band-min')];

                // Shift + Tab일 경우 역방향 이동
                if (e.shiftKey) {
                    if (type === 'grade') {
                        const currentIndex = allGrades.indexOf(input);
                        if (currentIndex > 0) {
                            allGrades[currentIndex - 1].focus();
                        } else {
                            // 첫 번째 학점명에서 Shift+Tab시 마지막 하한선으로
                            allMins[allMins.length - 1].focus();
                        }
                    } else if (type === 'min') {
                        const currentIndex = allMins.indexOf(input);
                        if (currentIndex > 0) {
                            allMins[currentIndex - 1].focus();
                        } else {
                            // 첫 번째 하한선에서 Shift+Tab시 마지막 학점명으로
                            allGrades[allGrades.length - 1].focus();
                        }
                    }
                } else {
                    // 기존 Tab 동작
                    if (type === 'grade') {
                        const currentIndex = allGrades.indexOf(input);
                        if (currentIndex < allGrades.length - 1) {
                            allGrades[currentIndex + 1].focus();
                        } else {
                            allMins[0].focus();
                        }
                    } else if (type === 'min') {
                        const currentIndex = allMins.indexOf(input);
                        if (currentIndex < allMins.length - 1) {
                            allMins[currentIndex + 1].focus();
                        } else {
                            allGrades[0].focus();
                        }
                    }
                }
            }
        });

        // 하한선 값 변경 시 자동 정렬 및 하위 구간 조정
        if (input.dataset.type === 'min') {
            input.addEventListener('change', () => {
                const newValue = parseFloat(input.value);
                if (!isNaN(newValue)) {
                    const allRows = [...document.querySelectorAll('.grade-band-row')];
                    const currentRowIndex = allRows.findIndex(r => r.contains(input));

                    for (let i = currentRowIndex + 1; i < allRows.length; i++) {
                        const minInput = allRows[i].querySelector('.grade-band-min');
                        const currentMin = parseFloat(minInput.value);
                        if (!isNaN(currentMin) && currentMin > newValue) {
                            minInput.value = newValue;
                        }
                    }
                    saveSettings();
                }
            });
        }
    });
}

// 구간 순서 변경 함수
function moveGradeBand(index, direction) {
    const rows = [...document.querySelectorAll('.grade-band-row')];
    if (direction === 'up' && index > 0) {
        // 위로 이동: 학점명만 교환
        const currentGrade = rows[index].querySelector('.grade-band-grade').value;
        const prevGrade = rows[index - 1].querySelector('.grade-band-grade').value;
        rows[index].querySelector('.grade-band-grade').value = prevGrade;
        rows[index - 1].querySelector('.grade-band-grade').value = currentGrade;
    } else if (direction === 'down' && index < rows.length - 1) {
        // 아래로 이동: 학점명만 교환
        const currentGrade = rows[index].querySelector('.grade-band-grade').value;
        const nextGrade = rows[index + 1].querySelector('.grade-band-grade').value;
        rows[index].querySelector('.grade-band-grade').value = nextGrade;
        rows[index + 1].querySelector('.grade-band-grade').value = currentGrade;
    }
    saveSettings();
}

// 학점 구간 입력 행 추가 함수 (주석: 하한선만 입력받도록 수정)
function addGradeBandRow() {
    const bands = getGradeBandsFromEditor();
    const lowestMin = bands.length > 0 ? bands[bands.length - 1].min : 0;
    // 새 구간 추가 시 기본값 설정
    bands.push({
        grade: "",
        min: Math.max(0, lowestMin - 10), // 이전 구간보다 10점 낮게 설정
        color: "rgba(128,128,128,0.2)"
    });
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

// 에디터 UI에서 현재 학점 구간 데이터 가져오는 함수 (주석: 자동 상한선 설정)
function getGradeBandsFromEditor() {
    const editorDiv = document.getElementById("grade-bands-editor");
    if (!editorDiv) return [];
    const rows = editorDiv.querySelectorAll('.grade-band-row');
    const bands = [];
    const defaultColors = defaultGradeBands.map(b => b.color);

    // 먼저 모든 유효한 입력값을 수집
    for (let i = 0; i < rows.length; i++) {
        const gradeInput = rows[i].querySelector('.grade-band-grade');
        const minInput = rows[i].querySelector('.grade-band-min');

        const grade = gradeInput.value.trim();
        const min = parseFloat(minInput.value);

        if (grade && !isNaN(min)) {
            bands.push({
                grade: grade,
                min: min,
                color: defaultColors[i] || "rgba(128,128,128,0.2)"
            });
        } else {
            console.warn(`학점 구간 ${i + 1}의 입력값이 유효하지 않습니다:`, { grade, min });
        }
    }

    // 최소값 기준으로 내림차순 정렬
    bands.sort((a, b) => b.min - a.min);

    // 각 구간의 상한선을 자동으로 설정
    for (let i = 0; i < bands.length; i++) {
        if (i === 0) {
            // 가장 높은 구간의 상한선은 100점
            bands[i].max = 100;
        } else {
            // 나머지 구간의 상한선은 바로 위 구간의 하한선 - 0.01
            bands[i].max = bands[i - 1].min - 0.01;
        }
    }

    return bands;
}

// 기존 getGradeBands 함수를 에디터 값 사용하도록 수정
function getGradeBands() {
    return getGradeBandsFromEditor();
}

// 기존 getGrade 함수를 커스텀 구간 사용하도록 수정
function getGrade(score) {
    // 점수를 백분율로 변환 (percentile은 0.0~1.0 범위의 값)
    const mean = parseFloat(document.getElementById("mean").value);
    const stddev = parseFloat(document.getElementById("stddev").value);

    // 백분율 계산 (상위 %)
    const percentile = (1 - normalCDF(score, mean, stddev)) * 100;

    // 백분율을 기준으로 학점 구간 판단
    const bands = getGradeBands();
    for (const band of bands) {
        // band.min은 상위 백분율 기준이므로 percentile과 직접 비교
        if (percentile >= band.min && percentile <= band.max) {
            return band.grade;
        }
    }

    // 가장 낮은 구간보다 낮은 경우
    if (bands.length > 0 && percentile < bands[bands.length - 1].min) {
        return bands[bands.length - 1].grade;
    }

    return "N/A";
}

// 페이지 로드 시 설정 불러오기
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

// erf의 역함수 추가 (주석: 백분율을 점수로 변환하기 위해 필요)
function erfInv(x) {
    const a = 0.147;
    let y, z;

    if (x >= 1) {
        return Infinity;
    } else if (x <= -1) {
        return -Infinity;
    }

    const signX = x < 0 ? -1 : 1;
    const absX = Math.abs(x);

    if (absX <= 0.7) {
        const z = absX * absX;
        y = absX * (((1.6112374 * z + 4.0676275) * z + 3.0899424) * z + 1)
            / (((1.7027532 * z + 3.7108478) * z + 1.5119628) * z + 1);
    } else {
        const z = Math.sqrt(-Math.log((1 - absX) / 2));
        y = (((2.3212128 * z + 4.8501413) * z + 2.6977039) * z - 0.3897065)
            / ((1.8212559 * z + 3.2577336) * z + 1);
    }

    return signX * y;
}

// drawChart 함수 수정 - 이전 방식의 차트 배경 표시로 수정
function drawChart(mean, stddev, score) {
    const ctx = document.getElementById("chartCanvas").getContext("2d");
    const currentBands = getGradeBands(); // 현재 커스텀 학점 구간
    const population = parseInt(document.getElementById("population").value) || 0; // 전체 인원수

    // showPercentile 변수는 유지 (토글 기능)
    const showPercentile = showChartType === 'percentile';

    // 데이터 생성
    const data = [];
    const minScore = mean - 4 * stddev;
    const maxScore = mean + 4 * stddev;
    const step = (maxScore - minScore) / 200;

    for (let x = minScore; x <= maxScore; x += step) {
        const density = normalPDF(x, mean, stddev);
        const percentile = (1 - normalCDF(x, mean, stddev)) * 100;
        data.push({
            score: x,
            percentile: percentile,
            count: density * population * step
        });
    }

    // X축 데이터 설정 (토글 상태에 따라 점수 또는 백분율 사용)
    const labels = data.map(d => showPercentile ? d.percentile : d.score);
    const chartData = data.map(d => d.count);

    // 학점 구간 배경 플러그인 (수정: 간소화하여 이전 방식으로 변경)
    const bandPlugin = {
        id: 'gradeBands',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;

            currentBands.forEach(band => {
                ctx.fillStyle = band.color;

                // 해당 구간의 x 위치 계산 (모드에 따라 다름)
                let xMin, xMax, bandLabel;

                if (showPercentile) {
                    // 백분율 모드: 상위 백분율 기준으로 표시
                    const topPercentile = 100 - band.min;
                    const nextTopPercentile = band.max === 100 ? 0 : (100 - band.max);

                    xMin = x.getPixelForValue(nextTopPercentile);
                    xMax = x.getPixelForValue(topPercentile);
                    bandLabel = `${band.grade} (${band.min}점~${band.max}점)`;
                } else {
                    // 점수 모드: 실제 점수 기준으로 표시
                    xMin = x.getPixelForValue(band.min);
                    xMax = x.getPixelForValue(band.max);
                    const percentile = (1 - normalCDF(band.min, mean, stddev)) * 100;
                    bandLabel = `${band.grade} (상위 ${percentile.toFixed(1)}%)`;
                }

                // 너비 계산 및 음수 너비 처리
                const width = Math.abs(xMax - xMin);

                if (width > 0) {
                    // 시작점 조정 (왼쪽 좌표가 작은 값을 선택)
                    const displayMin = Math.min(xMin, xMax);
                    ctx.fillRect(displayMin, top, width, bottom - top);

                    // 구간 레이블 표시
                    ctx.save();
                    ctx.fillStyle = 'rgba(0,0,0,0.7)';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    const labelY = top + 20;
                    const centerX = displayMin + width / 2;
                    ctx.fillText(bandLabel, centerX, labelY);
                    ctx.restore();
                }
            });
        }
    };

    // 내 점수 표시 선 플러그인 (유지)
    const scoreLinePlugin = {
        id: 'userScoreLine',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(showPercentile ? 
                (1 - normalCDF(score, mean, stddev)) * 100 : 
                score
            );

            // 세로선 그리기
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 텍스트 표시 설정
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';

            // 점수와 백분율 모두 표시
            const percentile = (1 - normalCDF(score, mean, stddev)) * 100;
            const scoreText = `${score}점`;
            const percentileText = `상위 ${percentile.toFixed(1)}%`;

            // 두 줄로 텍스트 표시
            ctx.fillText(scoreText, xPos, top - 20);
            ctx.fillText(percentileText, xPos, top - 5);

            ctx.restore();
        }
    };

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '예상 인원수',
                data: chartData,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                barPercentage: 1.0,
                categoryPercentage: 1.0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    offset: false,
                    reverse: showPercentile,
                    title: {
                        display: true,
                        text: showPercentile ? '상위 백분율 (%)' : '점수'
                    },
                    min: showPercentile ? 0 : minScore,
                    max: showPercentile ? 100 : maxScore,
                    ticks: {
                        maxTicksLimit: 10,
                        callback: function (value) {
                            if (showPercentile) {
                                return '상위 ' + value.toFixed(0) + '%';
                            }
                            return value.toFixed(0) + '점';
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '예상 인원수'
                    },
                    beginAtZero: true
                }
            },
            plugins: {
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function (tooltipItems) {
                            const value = tooltipItems[0].parsed.x;
                            if (showPercentile) {
                                return `상위 ${value.toFixed(1)}% 구간`;
                            }
                            return `${value.toFixed(1)}점 구간`;
                        },
                        label: function (tooltipItem) {
                            const count = tooltipItem.parsed.y;
                            return `예상 인원: ${count.toFixed(1)}명`;
                        }
                    }
                }
            }
        },
        plugins: [bandPlugin, scoreLinePlugin]
    });

    // 차트 데이터 저장 (토글 시 사용)
    lastChartData = { mean, stddev, score };
}

// 차트 타입 토글 이벤트 리스너
document.getElementById("chart-type-toggle").addEventListener("change", function () {
    // 체크박스 상태에 따라 차트 타입 설정 (주석)
    showChartType = this.checked ? 'percentile' : 'score';

    if (lastChartData) {
        drawChart(lastChartData.mean, lastChartData.stddev, lastChartData.score);
    }
});

function renderGradeTable(mean, stddev, population) {
    const bands = getGradeBands();
    const tableContainer = document.getElementById("grade-table");
    if (!tableContainer) return;

    let html = `<h3 class="text-lg font-semibold mb-1">학점 구간별 정보</h3>
    <p class="text-sm text-gray-600 mb-2">* 하한선은 상위 백분율을 의미합니다. (예: 90은 상위 10%를 의미)</p>`;

    html += `<table class="min-w-full border text-center text-sm">
    <thead class="bg-blue-100">
      <tr>
        <th class="border px-2 py-1">학점</th>
        <th class="border px-2 py-1">상위 백분율</th>
        <th class="border px-2 py-1">예상 점수 구간</th>
        <th class="border px-2 py-1">예상 인원</th>
      </tr>
    </thead>
    <tbody>`;

    bands.forEach((band, index) => {
        // 현재 구간의 상위 백분율 계산 (주석: 입력값이 이미 백분율)
        const topPercentile = 100 - band.min; // 예: 입력 90은 상위 10%를 의미

        // 다음 구간의 상위 백분율 계산 (주석: 마지막 구간이면 100% 사용)
        const nextTopPercentile = index === bands.length - 1 ? 100 : (100 - bands[index + 1].min);

        // 백분율을 기반으로 실제 점수 계산 (주석)
        const p1 = topPercentile / 100; // 현재 구간의 백분율을 0~1 범위로 변환
        const p2 = nextTopPercentile / 100; // 다음 구간의 백분율을 0~1 범위로 변환

        // 역정규분포를 사용하여 점수 계산 (주석)
        const score1 = mean + stddev * Math.sqrt(2) * erfInv(1 - 2 * p1);
        const score2 = mean + stddev * Math.sqrt(2) * erfInv(1 - 2 * p2);

        // 예상 인원수 계산 (주석: 현재 구간의 백분율 차이 * 전체 인원수)
        const expectedCount = Math.round((nextTopPercentile - topPercentile) * population / 100);

        html += `<tr>
            <td class="border px-2 py-1">${band.grade}</td>
            <td class="border px-2 py-1">상위 ${topPercentile.toFixed(1)}%</td>
            <td class="border px-2 py-1">${Math.round(score1)}점 ~ ${Math.round(score2)}점</td>
            <td class="border px-2 py-1">${expectedCount}명</td>
        </tr>`;
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

    // drawChart(mean, stddev, score);
    renderGradeTable(mean, stddev, population);
}
