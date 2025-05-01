let chart = null;
// localStorage 키 정의 (주석: 설정 저장을 위한 고유 키)
const LS_SETTINGS_KEY = 'gradeCalculatorSettings_v1'; // 버전 명시하여 추후 호환성 관리 용이 (주석)

// 기본 학점 구간 정의 (주석: 초기값 또는 저장된 설정 없을 시 사용)
const defaultGradeBands = [
    // A학점 30% (A+ 10%, A0 20%), B학점 40% (B+ 20%, B0 20%), C학점 이하 30% (C+ 15%, C0 10%, D 이하 5%) (주석)
    { grade: "A+", min: 90, max: 100, color: "rgba(37,99,235,0.2)" },
    { grade: "A0", min: 85, max: 89.99, color: "rgba(56,189,248,0.2)" },
    { grade: "B+", min: 80, max: 84.99, color: "rgba(22,163,74,0.2)" },
    { grade: "B0", min: 75, max: 79.99, color: "rgba(132,204,22,0.2)" },
    { grade: "C+", min: 70, max: 74.99, color: "rgba(234,179,8,0.2)" },
    { grade: "C0", min: 65, max: 69.99, color: "rgba(249,115,22,0.2)" },
    { grade: "D or lower", min: 0, max: 64.99, color: "rgba(220,38,38,0.2)" }
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

// localStorage와 입력값을 초기화하는 함수 (주석: 새로 추가)
function resetAllData() {
    if (confirm('모든 설정과 입력값이 초기화됩니다. 계속하시겠습니까?')) {
        // localStorage 초기화 (주석)
        localStorage.removeItem('gradeBands');
        localStorage.removeItem('lastInputs');

        // 입력값 초기화 (주석)
        document.getElementById('mean').value = '';
        document.getElementById('stddev').value = '';
        document.getElementById('population').value = '';
        document.getElementById('score').value = '';

        // 차트 초기화 (주석)
        const ctx = document.getElementById('chartCanvas').getContext('2d');
        if (window.myChart) {
            window.myChart.destroy();
        }

        // 결과 텍스트 초기화 (주석)
        document.getElementById('result').innerHTML = '';
        document.getElementById('grade-table').innerHTML = '';

        // 학점 구간 에디터 초기화 (주석)
        renderGradeBandEditor(defaultGradeBands);
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

// 학점 구간 입력 행 생성 함수
function createGradeBandRow(band, index, totalRows) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-4 gap-2 items-center grade-band-row';
    row.dataset.index = index;

    // 순서 변경 버튼을 포함한 새로운 레이아웃
    row.innerHTML = `
        <input type="text" placeholder="학점명 (예: A+)" value="${band.grade || ''}" 
            class="input grade-band-grade" data-type="grade" aria-label="학점명 ${index + 1}">
        <input type="number" step="0.01" placeholder="최소 점수" value="${band.min}" 
            class="input grade-band-min" data-type="min" aria-label="최소 점수 ${index + 1}">
        <div class="flex gap-1">
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

                // Shift + Tab일 경우 역방향 이동 (주석)
                if (e.shiftKey) {
                    if (type === 'grade') {
                        const currentIndex = allGrades.indexOf(input);
                        if (currentIndex > 0) {
                            allGrades[currentIndex - 1].focus();
                        } else {
                            // 첫 번째 학점명에서 Shift+Tab시 마지막 하한선으로 (주석)
                            allMins[allMins.length - 1].focus();
                        }
                    } else if (type === 'min') {
                        const currentIndex = allMins.indexOf(input);
                        if (currentIndex > 0) {
                            allMins[currentIndex - 1].focus();
                        } else {
                            // 첫 번째 하한선에서 Shift+Tab시 마지막 학점명으로 (주석)
                            allGrades[allGrades.length - 1].focus();
                        }
                    }
                } else {
                    // 기존 Tab 동작 (주석)
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

        // 하한선 값 변경 시 자동 정렬 및 하위 구간 조정 (주석)
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
    // 새 구간 추가 시 기본값 설정 (주석)
    bands.push({
        grade: "",
        min: Math.max(0, lowestMin - 10), // 이전 구간보다 10점 낮게 설정 (주석)
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

    // 먼저 모든 유효한 입력값을 수집 (주석)
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

    // 최소값 기준으로 내림차순 정렬 (주석)
    bands.sort((a, b) => b.min - a.min);

    // 각 구간의 상한선을 자동으로 설정 (주석)
    for (let i = 0; i < bands.length; i++) {
        if (i === 0) {
            // 가장 높은 구간의 상한선은 100점 (주석)
            bands[i].max = 100;
        } else {
            // 나머지 구간의 상한선은 바로 위 구간의 하한선 - 0.01 (주석)
            bands[i].max = bands[i - 1].min - 0.01;
        }
    }

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

// drawChart 함수 수정 (주석: 막대 그래프(히스토그램)로 변경, y축은 예상 인원수)
function drawChart(mean, stddev, score) {
    const ctx = document.getElementById("chartCanvas").getContext("2d");
    const currentBands = getGradeBands(); // 현재 커스텀 학점 구간 (주석)
    const population = parseInt(document.getElementById("population").value) || 0; // 전체 인원수 (주석)

    const scores = []; // x축: 점수 값 (주석)
    const estimatedCounts = []; // y축: 해당 점수 구간의 예상 인원수 (주석)

    // 그래프 x축(점수) 범위 결정 (주석)
    const xMinScore = Math.floor(Math.max(0, mean - 4 * stddev)); // 최소 점수 (0점 이상, 정수) (주석)
    const xMaxScore = Math.ceil(Math.max(100, mean + 4 * stddev)); // 최대 점수 (100점 이상, 정수) (주석)

    // 각 점수(정수 단위) 구간별 예상 인원수 계산 (주석)
    for (let s = xMinScore; s <= xMaxScore; s++) {
        scores.push(s); // x축 점수 추가 (주석)
        // 점수 s를 중심으로 하는 1점 구간(s-0.5 ~ s+0.5)의 확률 계산 (주석)
        const probability = normalCDF(s + 0.5, mean, stddev) - normalCDF(s - 0.5, mean, stddev);
        // 해당 구간의 예상 인원수 계산 (소수점 나올 수 있음) (주석)
        const count = probability * population;
        estimatedCounts.push(count); // y축 예상 인원수 추가 (주석)
    }

    // 학점 구간 배경 플러그인 (주석: 점수 기준, 막대 뒤에 그려지도록 beforeDatasetsDraw 사용)
    const bandPlugin = {
        id: 'gradeBandsScore', // ID 변경 (주석)
        beforeDatasetsDraw(chart) { // 막대보다 먼저 그려짐 (주석)
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            currentBands.forEach(band => {
                ctx.fillStyle = band.color;
                const xMinPixel = x.getPixelForValue(band.min);
                const xMaxPixel = x.getPixelForValue(band.max);
                const chartLeft = x.left;
                const chartRight = x.right;

                const startPixel = Math.max(xMinPixel, chartLeft);
                const endPixel = Math.min(xMaxPixel, chartRight);
                // 주석: 막대 그래프에서는 각 막대의 경계에 맞춰 그리는 것이 더 자연스러울 수 있음
                // 여기서는 기존 방식 유지 (배경 역할)
                const width = Math.max(0, endPixel - startPixel);

                if (width > 0) {
                    ctx.fillRect(startPixel, top, width, bottom - top);
                }
            });
        }
    };

    // 내 점수 표시 선 플러그인 (주석: 점수 기준, 막대 위에 그려지도록 afterDatasetsDraw 사용)
    const scoreLinePlugin = {
        id: 'userScoreLine', // ID 변경 (주석)
        afterDatasetsDraw(chart) { // 막대보다 나중에 그려짐 (주석)
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;
            const xPos = x.getPixelForValue(score); // 사용자의 점수 위치 (주석)
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 선 위에 점수 텍스트 표시 (선택 사항) (주석)
            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.fillText(`내 점수: ${score.toFixed(2)}`, xPos, top - 5); // 선 위에 표시 (주석)
            ctx.restore();
        }
    };

    // 기존 차트 파괴 및 재생성 (주석)
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar', // 주석: 차트 타입을 'bar'로 변경
        data: {
            labels: scores, // x축 레이블: 점수 (주석)
            datasets: [{
                label: '예상 인원수', // 데이터셋 레이블 변경 (주석)
                data: estimatedCounts, // y축 데이터: 예상 인원수 (주석)
                backgroundColor: 'rgba(59, 130, 246, 0.5)', // 막대 색상 (주석)
                borderColor: 'rgba(59, 130, 246, 1)', // 막대 테두리 색상 (주석)
                borderWidth: 1,
                barPercentage: 1.0, // 막대 간격 없애기 (히스토그램처럼) (주석)
                categoryPercentage: 1.0, // 막대 간격 없애기 (히스토그램처럼) (주석)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear', // 선형 축 (점수) (주석)
                    offset: false, // 막대가 눈금 사이에 위치하지 않도록 (주석)
                    title: {
                        display: true,
                        text: '점수' // x축 제목 (주석)
                    },
                    min: xMinScore, // 계산된 최소 점수 적용 (주석)
                    max: xMaxScore, // 계산된 최대 점수 적용 (주석)
                    ticks: {
                        stepSize: 5, // 5점 단위 눈금 제안 (가독성) (주석)
                        // autoSkip: true,
                        // maxTicksLimit: 20
                    }
                },
                y: {
                    display: true, // y축 표시 (주석)
                    title: {
                        display: true,
                        text: '예상 인원수' // y축 제목 변경 (주석)
                    },
                    beginAtZero: true, // y축은 0부터 시작 (주석)
                    ticks: {
                        // 예상 인원수가 정수가 아닐 수 있으므로, 필요시 포맷팅 (주석)
                        // callback: function(value) { return Number.isInteger(value) ? value : value.toFixed(1); },
                        maxTicksLimit: 8 // y축 눈금 개수 제한 (주석)
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, // 범례 표시 (주석)
                    position: 'top',
                },
                tooltip: {
                    enabled: true, // 툴팁 활성화 (주석)
                    mode: 'index', // 동일 인덱스(점수)의 모든 데이터 표시 (주석)
                    intersect: false,
                    callbacks: {
                        // 툴팁 내용 커스터마이즈 (주석)
                        title: function (tooltipItems) {
                            // 툴팁 제목: 점수 구간 (주석)
                            const score = tooltipItems[0].parsed.x;
                            return `${(score - 0.5).toFixed(1)} ~ ${(score + 0.5).toFixed(1)}점 구간`;
                        },
                        label: function (tooltipItem) {
                            // 툴팁 내용: 예상 인원수 (주석)
                            const count = tooltipItem.parsed.y;
                            return `예상 인원: ${count.toFixed(2)}명`; // 소수점 2자리 (주석)
                        }
                    }
                }
            }
        },
        plugins: [bandPlugin, scoreLinePlugin] // 플러그인 등록 (주석)
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
