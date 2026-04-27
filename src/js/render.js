import { computeScorePercentileRangeWithLimits, normalCDF } from './math.js';

export function renderGradeBandEditor(bands, callbacks) {
    const editorDiv = document.getElementById("grade-bands-editor");
    if (!editorDiv) return;
    editorDiv.innerHTML = '';
    
    bands.sort((a, b) => b.min - a.min).forEach((band, index) => {
        editorDiv.appendChild(createGradeBandRow(band, index, bands.length, callbacks));
    });
    
    editorDiv.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', callbacks.onSettingsChange);
    });
}

function createGradeBandRow(band, index, totalRows, callbacks) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-4 gap-2 items-center grade-band-row';
    row.dataset.index = index;

    row.innerHTML = `
        <input type="text" placeholder="학점명 (예: A+)" value="${band.grade || ''}" class="input grade-band-grade" data-type="grade" aria-label="학점명 ${index + 1}">
        <input type="number" step="0.01" placeholder="최소 점수" value="${band.min}" class="input grade-band-min" data-type="min" aria-label="최소 점수 ${index + 1}">
        <div class="flex justify-between">
            <button class="btn-move-up text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2" ${index === 0 ? 'disabled' : ''} aria-label="위로 이동">↑</button>
            <button class="btn-move-down text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2" ${index === totalRows - 1 ? 'disabled' : ''} aria-label="아래로 이동">↓</button>
        </div>
        <button class="btn-remove text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300" aria-label="${index + 1}번째 구간 삭제">삭제</button>
    `;

    row.querySelector('.btn-move-up').addEventListener('click', () => callbacks.onMoveBand(index, 'up'));
    row.querySelector('.btn-move-down').addEventListener('click', () => callbacks.onMoveBand(index, 'down'));
    row.querySelector('.btn-remove').addEventListener('click', () => callbacks.onRemoveBand(row));

    setupTabNavigation(row, callbacks.onSettingsChange);

    return row;
}

function setupTabNavigation(row, onSettingsChange) {
    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const type = input.dataset.type;
                const allGrades = [...document.querySelectorAll('.grade-band-grade')];
                const allMins = [...document.querySelectorAll('.grade-band-min')];

                if (e.shiftKey) {
                    if (type === 'grade') {
                        const currentIndex = allGrades.indexOf(input);
                        if (currentIndex > 0) {
                            allGrades[currentIndex - 1].focus();
                        } else {
                            allMins[allMins.length - 1].focus();
                        }
                    } else if (type === 'min') {
                        const currentIndex = allMins.indexOf(input);
                        if (currentIndex > 0) {
                            allMins[currentIndex - 1].focus();
                        } else {
                            allGrades[allGrades.length - 1].focus();
                        }
                    }
                } else {
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
                    if (onSettingsChange) onSettingsChange();
                }
            });
        }
    });
}

export function renderGradeTable(bands, mean, stddev, population, minScore, maxScore) {
    const tableContainer = document.getElementById("grade-table");
    if (!tableContainer) return;

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

        const bandProbability = (nextTopPercentile - topPercentile) / 100;
        const expectedCount = Math.round(bandProbability * population);

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
