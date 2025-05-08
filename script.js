let chart = null;
let lastChartData = null; // 전역 변수로 차트 설정 저장
let showChartType = 'score'; // 기본 차트 타입: score | percentile

// 기본 학점 구간 정의 (주석: 초기값 또는 저장된 설정 없을 시 사용)
const defaultGradeBands = [
    // A학점 30% (A+ 10%, A0 20%), B학점 40% (B+ 20%, B0 20%), C학점 이하 30% (C+ 15%, C0 10%, D 이하 5%)
    { grade: "A+", min: 90, max: 100, color: "rgba(37,99,235,0.2)" }, // A+ 구간
    { grade: "A0", min: 70, max: 89.99, color: "rgba(56,189,248,0.2)" }, // A0 구간
    { grade: "B+", min: 50, max: 69.99, color: "rgba(22,163,74,0.2)" }, // B+ 구간
    { grade: "B0", min: 30, max: 49.99, color: "rgba(132,204,22,0.2)" }, // B0 구간
    { grade: "C+", min: 15, max: 29.99, color: "rgba(234,179,8,0.2)" }, // C+ 구간
    { grade: "C0", min: 5, max: 14.99, color: "rgba(249,115,22,0.2)" }, // C0 구간
    { grade: "D or lower", min: 0, max: 4.99, color: "rgba(220,38,38,0.2)" }  // D 이하 구간
];

// localStorage와 입력값을 초기화하는 함수 (주석: 새로 추가)
function resetAllData() {
    if (confirm('모든 설정과 입력값이 초기화됩니다. 계속하시겠습니까?')) {
        // localStorage 초기화
        localStorage.removeItem(LS_SETTINGS_KEY);
        localStorage.removeItem('gradeBands');
        localStorage.removeItem('lastInputs');

        // 입력값 초기화
        document.getElementById('mean').value = '';
        document.getElementById('stddev').value = '';
        document.getElementById('population').value = '';
        document.getElementById('score').value = '';
        document.getElementById('min-score').value = ''; // 추가
        document.getElementById('max-score').value = ''; // 추가

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
    document.getElementById('min-score').value = ''; // 추가
    document.getElementById('max-score').value = ''; // 추가

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
                max: i === 0 ? 100 : bands[i - 1].min - 0.01,
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

// 기존 getGrade 함수를 범위 제한을 고려하도록 수정
function getGrade(score) {
    // 점수를 백분율로 변환 (percentile은 0.0~1.0 범위의 값)
    const mean = parseFloat(document.getElementById("mean").value);
    const stddev = parseFloat(document.getElementById("stddev").value);
    const minScore = parseFloat(document.getElementById("min-score").value); // 추가
    const maxScore = parseFloat(document.getElementById("max-score").value); // 추가

    // 범위 제한 적용한 백분율 계산 (상위 %)
    const percentile = calculatePercentileWithRange(score, mean, stddev, minScore, maxScore) * 100;

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

// 설정 저장 함수 업데이트
function saveSettings() {
    try {
        const currentGradeBands = getGradeBandsFromEditor();
        const settings = {
            mean: document.getElementById("mean").value,
            stddev: document.getElementById("stddev").value,
            population: document.getElementById("population").value,
            score: document.getElementById("score").value,
            minScore: document.getElementById("min-score").value, // 추가
            maxScore: document.getElementById("max-score").value, // 추가
            gradeBands: currentGradeBands
        };
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("localStorage 저장 중 오류 발생:", e);
        alert("설정을 저장하는 중 오류가 발생했습니다. 브라우저 저장 공간이 부족하거나 설정을 확인해주세요.");
    }
}

// 설정 불러오기 함수 업데이트
function loadSettings() {
    try {
        const savedSettings = localStorage.getItem(LS_SETTINGS_KEY);
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            // 저장된 입력값 복원
            document.getElementById("mean").value = settings.mean || '';
            document.getElementById("stddev").value = settings.stddev || '';
            document.getElementById("population").value = settings.population || '';
            document.getElementById("score").value = settings.score || '';
            document.getElementById("min-score").value = settings.minScore || ''; // 추가
            document.getElementById("max-score").value = settings.maxScore || ''; // 추가
            // 저장된 학점 구간이 있으면 사용, 없으면 기본값 사용
            renderGradeBandEditor(settings.gradeBands && settings.gradeBands.length > 0 ? settings.gradeBands : defaultGradeBands);
        } else {
            // 저장된 설정 없으면 기본 학점 구간으로 에디터 렌더링
            renderGradeBandEditor(defaultGradeBands);
        }

        // 테마 설정 불러오기
        loadThemeSettings();
    } catch (e) {
        console.error("localStorage 접근 중 오류 발생:", e);
        alert("설정을 불러오는 중 오류가 발생했습니다. 브라우저 설정을 확인해주세요.");
        renderGradeBandEditor(defaultGradeBands);
    }
}

// 페이지 로드 시 설정 불러오기
document.addEventListener('DOMContentLoaded', loadSettings);

// 차트 타입 토글 이벤트 리스너
document.getElementById("chart-type-toggle").addEventListener("change", function () {
    // 체크박스 상태에 따라 차트 타입 설정 (주석)
    showChartType = this.checked ? 'percentile' : 'score';

    if (lastChartData) {
        drawChart(lastChartData.mean, lastChartData.stddev, lastChartData.score);
    }
});

function calculateAndDraw() {
    const meanInput = document.getElementById("mean");
    const stddevInput = document.getElementById("stddev");
    const populationInput = document.getElementById("population");
    const scoreInput = document.getElementById("score");
    const minScoreInput = document.getElementById("min-score"); // 추가: 최소 점수 입력 가져오기
    const maxScoreInput = document.getElementById("max-score"); // 추가: 최대 점수 입력 가져오기

    const mean = parseFloat(meanInput.value);
    const stddev = parseFloat(stddevInput.value);
    const population = parseInt(populationInput.value);
    const score = parseFloat(scoreInput.value);
    const minScore = parseFloat(minScoreInput.value); // 추가: 최소 점수 파싱
    const maxScore = parseFloat(maxScoreInput.value); // 추가: 최대 점수 파싱

    let isValid = true;
    [meanInput, stddevInput, populationInput, scoreInput].forEach(input => input.classList.remove('border-red-500'));

    // 최소/최대 점수 입력 필드도 초기화
    minScoreInput.classList.remove('border-red-500');
    maxScoreInput.classList.remove('border-red-500');

    if (isNaN(mean)) { meanInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(stddev) || stddev <= 0) { stddevInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(population) || population <= 0) { populationInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(score)) { scoreInput.classList.add('border-red-500'); isValid = false; }

    // 최소/최대 점수 유효성 검사 추가
    if (!isNaN(minScore) && !isNaN(maxScore) && minScore >= maxScore) {
        minScoreInput.classList.add('border-red-500');
        maxScoreInput.classList.add('border-red-500');
        isValid = false;
    }

    // 점수가 범위를 벗어나는 경우 체크
    if (!isNaN(minScore) && !isNaN(score) && score < minScore) {
        scoreInput.classList.add('border-red-500');
        isValid = false;
    }

    if (!isNaN(maxScore) && !isNaN(score) && score > maxScore) {
        scoreInput.classList.add('border-red-500');
        isValid = false;
    }

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

    // 백분율 계산 시 점수 범위 고려
    const percentile = calculatePercentileWithRange(score, mean, stddev, minScore, maxScore);
    const percentileDisplay = Math.floor(percentile * 100000) / 1000;

    // 등수 계산 시 점수 범위를 고려한 조정
    let rank = Math.max(1, Math.ceil(percentile * population));

    // 만약 점수가 최대 점수를 초과하는 경우 1등으로 조정
    if (!isNaN(maxScore) && score >= maxScore) {
        rank = 1;
    }

    // 만약 점수가 최소 점수 미만인 경우 꼴등으로 조정
    if (!isNaN(minScore) && score <= minScore) {
        rank = population;
    }

    const grade = getGrade(score);

    document.getElementById("result").innerHTML = `
    🎯 내 점수는 상위 <strong>${percentileDisplay}%</strong>에 해당합니다.<br/>
    📊 예상 등수: <strong>${rank}</strong> / ${population}명 중<br/>
    🏅 예상 학점: <strong class=\"text-blue-600\">${grade !== "N/A" ? grade : "구간 없음"}</strong>
  `;

    drawChart(mean, stddev, score, minScore, maxScore);
    renderGradeTable(mean, stddev, population, minScore, maxScore);
}
