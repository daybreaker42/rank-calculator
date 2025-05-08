// chart, table 등 ui 렌더링 관련 js

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
        <input type="text" placeholder="학점명 (예: A+)" value="${band.grade || ''}" class="input grade-band-grade" data-type="grade" aria-label="학점명 ${index + 1}">
        <input type="number" step="0.01" placeholder="최소 점수" value="${band.min}" class="input grade-band-min" data-type="min" aria-label="최소 점수 ${index + 1}">
        <div class="flex justify-between">
            <button onclick="moveGradeBand(${index}, 'up')" class="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2" ${index === 0 ? 'disabled' : ''} aria-label="위로 이동">↑</button>
            <button onclick="moveGradeBand(${index}, 'down')" class="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2" ${index === totalRows - 1 ? 'disabled' : ''} aria-label="아래로 이동">↓</button>
        </div>
        <button onclick="removeGradeBandRow(this)" class="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" aria-label="${index + 1}번째 구간 삭제">삭제</button>
    `;

    // 탭 키 네비게이션 순서 설정
    setupTabNavigation(row);

    return row;
}

// drawChart 함수 수정 - minScore, maxScore 매개변수 추가
function drawChart(mean, stddev, score, minScore, maxScore) {
    const ctx = document.getElementById("chartCanvas").getContext("2d");
    const currentBands = getGradeBands(); // 현재 커스텀 학점 구간
    const population = parseInt(document.getElementById("population").value) || 0; // 전체 인원수

    // 다크모드 감지
    const isDarkMode = document.documentElement.classList.contains('dark');

    // showPercentile 변수는 유지 (토글 기능)
    const showPercentile = showChartType === 'percentile';

    // 데이터 범위 설정 (최소/최대 점수 고려)
    let minDataScore = mean - 4 * stddev;
    let maxDataScore = mean + 4 * stddev;

    // 최소/최대 점수가 설정된 경우 범위 적용
    if (!isNaN(minScore)) {
        minDataScore = Math.max(minDataScore, minScore);
    }

    if (!isNaN(maxScore)) {
        maxDataScore = Math.min(maxDataScore, maxScore);
    }

    const stepCount = 50; // 데이터 포인트 수
    const step = (maxDataScore - minDataScore) / stepCount;

    // 데이터 생성
    const data = [];

    // 백분율 모드에서는 백분율 간격을 균등하게 분포시키기 위한 수정
    if (showPercentile) {
        // 백분율 기준으로 균등한 간격으로 데이터 생성
        const percentileStep = 100 / stepCount;
        for (let percentile = 0; percentile <= 100; percentile += percentileStep) {
            // 역으로 백분율에 해당하는 점수 계산
            let p = 1 - (percentile / 100);
            p = Math.max(0.0001, Math.min(0.9999, p)); // 0과 1 사이로 제한

            // 범위 제한을 고려한 점수 계산
            let x;
            if (!isNaN(minScore) && !isNaN(maxScore)) {
                // 제한된 범위 내에서 백분율에 해당하는 점수 계산
                // 클램핑: 범위를 벗어나는 점수는 범위 내로 제한
                const originalX = normalInverseCDF(p, mean, stddev);
                x = Math.max(minScore, Math.min(maxScore, originalX));
            } else {
                x = normalInverseCDF(p, mean, stddev);
            }

            // 유효한 점수 범위 내에 있는 경우만 추가
            if (x >= minDataScore && x <= maxDataScore) {
                // 범위 제한이 있을 경우 조정된 확률밀도함수 사용
                const density = !isNaN(minScore) && !isNaN(maxScore)
                    ? truncatedNormalPDF(x, mean, stddev, minScore, maxScore)
                    : normalPDF(x, mean, stddev);

                data.push({
                    score: x,
                    percentile: percentile,
                    count: density * population * step
                });
            }
        }
    } else {
        // 점수 모드에서 점수 간격을 균등하게 분포
        for (let x = minDataScore; x <= maxDataScore; x += step) {
            // 범위 제한이 있을 경우 조정된 확률밀도함수 사용
            const density = !isNaN(minScore) && !isNaN(maxScore)
                ? truncatedNormalPDF(x, mean, stddev, minScore, maxScore)
                : normalPDF(x, mean, stddev);

            // 조정된 백분율 계산
            const percentile = !isNaN(minScore) && !isNaN(maxScore)
                ? (1 - truncatedNormalCDF(x, mean, stddev, minScore, maxScore)) * 100
                : (1 - normalCDF(x, mean, stddev)) * 100;

            data.push({
                score: x,
                percentile: percentile,
                count: density * population * step
            });
        }
    }

    // X축 데이터 설정 (토글 상태에 따라 점수 또는 백분율 사용)
    const labels = data.map(d => showPercentile ? d.percentile : d.score);
    const chartData = data.map(d => d.count);

    // 학점 구간 배경 플러그인 수정: 범위 제한 고려
    const bandPlugin = {
        id: 'gradeBands',
        beforeDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;

            currentBands.forEach((band, index) => {
                ctx.fillStyle = band.color;

                // 해당 구간의 x 위치 계산 (모드에 따라 다름)
                let xMin, xMax, bandLabel;
                const [topPercentile, nextTopPercentile, minScoreVal, maxScoreVal] =
                    computeScorePercentileRangeWithLimits(
                        mean,
                        stddev,
                        band.max,
                        index === currentBands.length - 1 ? 0 : currentBands[index + 1].max,
                        minScore,
                        maxScore
                    );

                if (showPercentile) {
                    xMin = x.getPixelForValue(nextTopPercentile);
                    xMax = x.getPixelForValue(topPercentile);
                    bandLabel = `${band.grade}\n(${nextTopPercentile}%~${topPercentile}%)`;
                } else {
                    // 점수 모드: 실제 점수 기준으로 표시
                    xMin = x.getPixelForValue(minScoreVal);
                    xMax = x.getPixelForValue(maxScoreVal);
                    bandLabel = `${band.grade}\n(${minScoreVal.toFixed(0)}점~${maxScoreVal.toFixed(0)}점)`;
                }

                // 너비 계산 및 음수 너비 처리
                const width = Math.abs(xMax - xMin);

                if (width > 0) {
                    // 시작점 조정 (왼쪽 좌표가 작은 값을 선택)
                    const displayMin = Math.min(xMin, xMax);
                    ctx.fillRect(displayMin, top, width, bottom - top);

                    // 구간 레이블 표시
                    ctx.save();
                    // 다크모드에서 텍스트 색상 조정
                    ctx.fillStyle = isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';
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

    // 내 점수 표시 선 플러그인 - 범위 제한 고려하여 수정
    const scoreLinePlugin = {
        id: 'userScoreLine',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;

            // 범위 제한을 고려한 백분율 계산
            const adjustedPercentile = calculatePercentileWithRange(score, mean, stddev, minScore, maxScore) * 100;

            // x축 위치 계산
            const xPos = x.getPixelForValue(showPercentile ?
                adjustedPercentile :
                score
            );

            // 점수가 표시 범위를 벗어나는 경우 표시하지 않음
            if (xPos < chart.chartArea.left || xPos > chart.chartArea.right) {
                return;
            }

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
            const percentile = calculatePercentileWithRange(score, mean, stddev, minScore, maxScore) * 100;
            const scoreText = `${score}점`;
            const percentileText = `상위 ${percentile.toFixed(1)}%`;

            // 두 줄로 텍스트 표시
            ctx.fillText(scoreText, xPos, top - 20);
            ctx.fillText(percentileText, xPos, top - 5);

            ctx.restore();
        }
    };

    // 최소/최대 점수 제한선 플러그인 (추가)
    const scoreLimitPlugin = {
        id: 'scoreLimits',
        afterDatasetsDraw(chart) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chart;

            // 최소 점수 제한선 그리기
            if (!isNaN(minScore) && showChartType === 'score') {
                const minXPos = x.getPixelForValue(minScore);

                // 차트 영역 내에 있을 때만 표시
                if (minXPos >= chart.chartArea.left && minXPos <= chart.chartArea.right) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(minXPos, top);
                    ctx.lineTo(minXPos, bottom);
                    ctx.strokeStyle = 'rgba(255, 99, 132, 0.8)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]); // 점선으로 표시
                    ctx.stroke();

                    // 레이블 표시
                    ctx.fillStyle = 'rgba(255, 99, 132, 0.8)';
                    ctx.textAlign = 'center';
                    ctx.font = '10px Arial';
                    ctx.fillText(`최소: ${minScore}점`, minXPos, bottom + 15);
                    ctx.restore();
                }
            }

            // 최대 점수 제한선 그리기
            if (!isNaN(maxScore) && showChartType === 'score') {
                const maxXPos = x.getPixelForValue(maxScore);

                // 차트 영역 내에 있을 때만 표시
                if (maxXPos >= chart.chartArea.left && maxXPos <= chart.chartArea.right) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(maxXPos, top);
                    ctx.lineTo(maxXPos, bottom);
                    ctx.strokeStyle = 'rgba(54, 162, 235, 0.8)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]); // 점선으로 표시
                    ctx.stroke();

                    // 레이블 표시
                    ctx.fillStyle = 'rgba(54, 162, 235, 0.8)';
                    ctx.textAlign = 'center';
                    ctx.font = '10px Arial';
                    ctx.fillText(`최대: ${maxScore}점`, maxXPos, bottom + 15);
                    ctx.restore();
                }
            }
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
                backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.5)',
                borderColor: isDarkMode ? 'rgba(96, 165, 250, 1)' : 'rgba(59, 130, 246, 1)',
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
                        text: showPercentile ? '상위 백분율 (%)' : '점수',
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
                    },
                    // 축 범위 설정 (최소/최대 점수 고려)
                    min: showPercentile ? 0 : minDataScore,
                    max: showPercentile ? 100 : maxDataScore,
                    ticks: {
                        maxTicksLimit: 10,
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)',
                        callback: function (value) {
                            if (showPercentile) {
                                return '상위 ' + value.toFixed(0) + '%';
                            }
                            return value.toFixed(0) + '점';
                        }
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '예상 인원수',
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
                    },
                    beginAtZero: true,
                    ticks: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'
                    },
                    grid: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    }
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

                            // 각 막대는 구간을 나타내므로 시작과 끝 값을 계산해서 범위로 표시
                            if (showPercentile) {
                                // 백분율 모드인 경우
                                const rangeStart = value - (step / 2);
                                const rangeEnd = value + (step / 2);
                                return `상위 ${rangeStart.toFixed(1)}% ~ ${rangeEnd.toFixed(1)}% 구간`;
                            } else {
                                // 점수 모드인 경우
                                const rangeStart = value - (step / 2);
                                const rangeEnd = value + (step / 2);
                                return `${rangeStart.toFixed(1)}점 ~ ${rangeEnd.toFixed(1)}점 구간`;
                            }
                        },
                        label: function (tooltipItem) {
                            const count = tooltipItem.parsed.y;
                            return `예상 인원: ${count.toFixed(1)}명`;
                        }
                    },
                    backgroundColor: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'rgba(0, 0, 0, 0.8)',
                    titleColor: isDarkMode ? 'rgba(255, 255, 255, 0.9)' : 'white',
                    bodyColor: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'white',
                    padding: 10,
                    cornerRadius: 4
                },
                legend: {
                    labels: {
                        color: isDarkMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)'
                    }
                }
            }
        },
        plugins: [bandPlugin, scoreLinePlugin, scoreLimitPlugin]
    });

    // 차트 데이터 저장 (토글 시 사용)
    lastChartData = { mean, stddev, score, minScore, maxScore };
}

// 학점 구간별 테이블 렌더링 함수 (범위 제한 적용)
function renderGradeTable(mean, stddev, population, minScore, maxScore) {
    const bands = getGradeBands();
    const tableContainer = document.getElementById("grade-table");
    if (!tableContainer) return;

    // 다크모드 감지
    const isDarkMode = document.documentElement.classList.contains('dark');
    const headerClass = isDarkMode ? 'bg-blue-900 text-white' : 'bg-blue-100';
    const tableClass = isDarkMode ? 'border-gray-700' : 'border';
    const textClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';

    let html = `<h3 class="text-lg font-semibold mb-1">학점 구간별 정보</h3>
    <p class="text-sm ${textClass} mb-2">* 하한선은 상위 백분율을 의미합니다. (예: 90은 상위 10%를 의미)</p>`;

    html += `<table class="min-w-full ${tableClass} text-center text-sm">
    <thead class="${headerClass}">
      <tr>
        <th class="border px-2 py-1">학점</th>
        <th class="border px-2 py-1">상위 백분율</th>
        <th class="border px-2 py-1">예상 점수 구간</th>
        <th class="border px-2 py-1">예상 인원</th>
      </tr>
    </thead>
    <tbody class="${isDarkMode ? 'text-gray-300' : ''}">`;

    bands.forEach((band, index) => {
        const [topPercentile, nextTopPercentile, score1, score2] =
            computeScorePercentileRangeWithLimits(
                mean,
                stddev,
                band.max,
                index === bands.length - 1 ? 0 : bands[index + 1].max,
                minScore,
                maxScore
            );

        // 범위 제한을 고려한 예상 인원수 계산
        let expectedCount;
        if (!isNaN(minScore) || !isNaN(maxScore)) {
            // 조정된 백분율 차이 계산
            const minValueCDF = !isNaN(minScore) ? normalCDF(minScore, mean, stddev) : 0;
            const maxValueCDF = !isNaN(maxScore) ? normalCDF(maxScore, mean, stddev) : 1;
            const totalProbability = maxValueCDF - minValueCDF;

            // 현재 구간의 조정된 백분율 계산
            const bandProbability = (nextTopPercentile - topPercentile) / 100;

            // 전체 중 현재 구간이 차지하는 비율 계산
            expectedCount = Math.round((bandProbability / totalProbability) * population);
        } else {
            // 기존 방식 (정규분포 전체 범위)
            expectedCount = Math.round((nextTopPercentile - topPercentile) * population / 100);
        }

        // 다크모드에서 행 배경색 교대 적용
        const rowClass = isDarkMode
            ? (index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-900')
            : (index % 2 === 0 ? 'bg-gray-100' : 'bg-white');

        html += `<tr class="${rowClass}">
            <td class="border px-2 py-1">${band.grade}</td>
            <td class="border px-2 py-1">상위 ${nextTopPercentile.toFixed(1)}%</td>
            <td class="border px-2 py-1">${Math.round(score1)}점 ~ ${Math.round(score2)}점</td>
            <td class="border px-2 py-1">${expectedCount}명</td>
        </tr>`;
    });

    html += `</tbody></table>`;
    tableContainer.innerHTML = html;
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