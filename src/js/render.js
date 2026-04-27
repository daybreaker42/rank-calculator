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
    row.className = 'grid grid-cols-12 gap-3 items-center grade-band-row group';
    row.dataset.index = index;

    row.innerHTML = `
        <div class="col-span-3">
            <input type="text" placeholder="예: A+" value="${band.grade || ''}" class="w-full px-3 py-2 rounded-lg bg-[#f5f5f7] dark:bg-black border border-transparent focus:border-[#0071e3] focus:bg-white dark:focus:bg-[#1d1d1f] focus:ring-4 focus:ring-[#0071e3]/20 transition-all outline-none text-center grade-band-grade" data-type="grade" aria-label="학점명 ${index + 1}">
        </div>
        <div class="col-span-3">
            <input type="number" step="0.01" placeholder="최소 점수" value="${band.min}" class="w-full px-3 py-2 rounded-lg bg-[#f5f5f7] dark:bg-black border border-transparent focus:border-[#0071e3] focus:bg-white dark:focus:bg-[#1d1d1f] focus:ring-4 focus:ring-[#0071e3]/20 transition-all outline-none text-center grade-band-min" data-type="min" aria-label="최소 점수 ${index + 1}">
        </div>
        <div class="col-span-3 flex justify-center gap-2">
            <button class="btn-move-up p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-gray-100 dark:hover:bg-[#2c2c2e] dark:hover:text-white transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}" ${index === 0 ? 'disabled' : ''} aria-label="위로 이동">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd" /></svg>
            </button>
            <button class="btn-move-down p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-gray-100 dark:hover:bg-[#2c2c2e] dark:hover:text-white transition-colors ${index === totalRows - 1 ? 'opacity-30 cursor-not-allowed' : ''}" ${index === totalRows - 1 ? 'disabled' : ''} aria-label="아래로 이동">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
            </button>
        </div>
        <div class="col-span-3 flex justify-center">
            <button class="btn-remove p-1.5 rounded-md text-[#ff3b30] hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" aria-label="${index + 1}번째 구간 삭제">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>
            </button>
        </div>
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
    const headerClass = 'bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#1d1d1f] dark:text-white font-medium';
    const tableClass = 'border-collapse w-full text-left rounded-xl overflow-hidden shadow-sm border border-[#d2d2d7] dark:border-[#424245]';

    let html = `<h3 class="text-xl font-semibold tracking-tight mb-1 mt-8">학점 구간별 예상 통계</h3>
    <p class="text-[14px] text-[#6e6e73] dark:text-gray-400 mb-4">* 상위 백분율 기준</p>`;

    html += `<div class="overflow-x-auto"><table class="${tableClass} text-[15px]">
    <thead>
      <tr class="${headerClass} border-b border-[#d2d2d7] dark:border-[#424245]">
        <th class="px-4 py-3 font-semibold">학점</th>
        <th class="px-4 py-3 font-semibold">상위 백분율</th>
        <th class="px-4 py-3 font-semibold">예상 점수 구간</th>
        <th class="px-4 py-3 font-semibold text-right">예상 인원</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-[#d2d2d7] dark:divide-[#424245] bg-white dark:bg-[#1d1d1f]">`;

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

        html += `<tr class="hover:bg-gray-50 dark:hover:bg-[#2c2c2e] transition-colors">
            <td class="px-4 py-3 font-medium text-[#1d1d1f] dark:text-white">${band.grade}</td>
            <td class="px-4 py-3 text-[#6e6e73] dark:text-gray-300">상위 ${nextTopPercentile.toFixed(1)}%</td>
            <td class="px-4 py-3 text-[#6e6e73] dark:text-gray-300">${Math.round(score1)}점 ~ ${Math.round(score2)}점</td>
            <td class="px-4 py-3 text-right font-medium text-[#0071e3]">${expectedCount}명</td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    tableContainer.innerHTML = html;
}
