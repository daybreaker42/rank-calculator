import { defaultGradeBands } from './config.js';
import { getStoredSettings, saveStoredSettings, clearAllStoredData, initTheme, toggleTheme } from './storage.js';
import { renderGradeBandEditor, renderGradeTable } from './render.js';
import { drawChart, destroyChart, lastChartData } from './chart.js';
import { normalCDF, calculatePercentileWithRange } from './math.js';

let showChartType = 'score'; // 'score' | 'percentile'
let currentGradeBands = [];

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadSettings();
    attachEventListeners();
});

function attachEventListeners() {
    // Buttons
    document.querySelector('button[onclick="calculateAndDraw()"]')?.removeAttribute('onclick');
    document.querySelector('button[onclick="clearInputValues()"]')?.removeAttribute('onclick');
    document.querySelector('button[onclick="resetAllData()"]')?.removeAttribute('onclick');
    document.querySelector('button[onclick="addGradeBandRow()"]')?.removeAttribute('onclick');

    // we will find them by context or id. Since HTML doesn't have IDs for these buttons, we can add IDs in HTML or find them by text.
    // It's safer to just find all buttons and attach based on text or add IDs. We will add IDs to HTML in the next step, but for now we'll query by onclick in the original HTML then remove it.
    // Actually, it's better to add IDs to the HTML. We'll assume the HTML will be updated with these IDs.
    
    document.getElementById('btn-calculate')?.addEventListener('click', calculateAndDraw);
    document.getElementById('btn-clear')?.addEventListener('click', clearInputValues);
    document.getElementById('btn-reset')?.addEventListener('click', resetAllData);
    document.getElementById('btn-add-band')?.addEventListener('click', addGradeBandRow);

    document.getElementById("chart-type-toggle")?.addEventListener("change", function () {
        showChartType = this.checked ? 'percentile' : 'score';
        if (lastChartData) {
            drawChart(lastChartData.mean, lastChartData.stddev, lastChartData.score, lastChartData.minScore, lastChartData.maxScore, currentGradeBands, parseInt(document.getElementById("population").value) || 0, showChartType);
        }
    });

    document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
}

const editorCallbacks = {
    onSettingsChange: () => {
        saveSettings();
    },
    onMoveBand: (index, direction) => {
        if (direction === 'up' && index > 0) {
            const temp = currentGradeBands[index].grade;
            currentGradeBands[index].grade = currentGradeBands[index - 1].grade;
            currentGradeBands[index - 1].grade = temp;
        } else if (direction === 'down' && index < currentGradeBands.length - 1) {
            const temp = currentGradeBands[index].grade;
            currentGradeBands[index].grade = currentGradeBands[index + 1].grade;
            currentGradeBands[index + 1].grade = temp;
        }
        updateEditorUI();
        saveSettings();
    },
    onRemoveBand: (rowElement) => {
        const index = parseInt(rowElement.dataset.index, 10);
        if (!isNaN(index)) {
            currentGradeBands.splice(index, 1);
            updateEditorUI();
            saveSettings();
        }
    }
};

function updateEditorUI() {
    renderGradeBandEditor(currentGradeBands, editorCallbacks);
}

function loadSettings() {
    const settings = getStoredSettings();
    if (settings) {
        document.getElementById("mean").value = settings.mean || '';
        document.getElementById("stddev").value = settings.stddev || '';
        document.getElementById("population").value = settings.population || '';
        document.getElementById("score").value = settings.score || '';
        document.getElementById("min-score").value = settings.minScore || '';
        document.getElementById("max-score").value = settings.maxScore || '';
        currentGradeBands = settings.gradeBands && settings.gradeBands.length > 0 ? settings.gradeBands : [...defaultGradeBands];
    } else {
        currentGradeBands = [...defaultGradeBands];
    }
    updateEditorUI();
}

function saveSettings() {
    // Read from DOM
    const bands = getGradeBandsFromEditor();
    currentGradeBands = bands;
    
    const settings = {
        mean: document.getElementById("mean").value,
        stddev: document.getElementById("stddev").value,
        population: document.getElementById("population").value,
        score: document.getElementById("score").value,
        minScore: document.getElementById("min-score").value,
        maxScore: document.getElementById("max-score").value,
        gradeBands: currentGradeBands
    };
    saveStoredSettings(settings);
}

function getGradeBandsFromEditor() {
    const editorDiv = document.getElementById("grade-bands-editor");
    if (!editorDiv) return currentGradeBands;
    const rows = editorDiv.querySelectorAll('.grade-band-row');
    const bands = [];
    const defaultColors = defaultGradeBands.map(b => b.color);

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
                color: currentGradeBands[i]?.color || defaultColors[i] || "rgba(128,128,128,0.2)"
            });
        }
    }

    bands.sort((a, b) => b.min - a.min);
    for (let i = 0; i < bands.length; i++) {
        if (i === 0) {
            bands[i].max = 100;
        } else {
            bands[i].max = bands[i - 1].min - 0.01;
        }
    }

    return bands;
}

function resetAllData() {
    if (confirm('모든 설정과 입력값이 초기화됩니다. 계속하시겠습니까?')) {
        clearAllStoredData();

        document.getElementById('mean').value = '';
        document.getElementById('stddev').value = '';
        document.getElementById('population').value = '';
        document.getElementById('score').value = '';
        document.getElementById('min-score').value = '';
        document.getElementById('max-score').value = '';

        destroyChart();

        document.getElementById('result').innerHTML = '';
        document.getElementById('grade-table').innerHTML = '';

        currentGradeBands = [...defaultGradeBands];
        updateEditorUI();
    }
}

function clearInputValues() {
    document.getElementById('mean').value = '';
    document.getElementById('stddev').value = '';
    document.getElementById('population').value = '';
    document.getElementById('score').value = '';
    document.getElementById('min-score').value = '';
    document.getElementById('max-score').value = '';

    document.getElementById('result').innerHTML = '';
    destroyChart();
    document.getElementById('grade-table').innerHTML = '';
}

function addGradeBandRow() {
    const lowestMin = currentGradeBands.length > 0 ? currentGradeBands[currentGradeBands.length - 1].min : 0;
    currentGradeBands.push({
        grade: "",
        min: Math.max(0, lowestMin - 10),
        color: "rgba(128,128,128,0.2)"
    });
    updateEditorUI();
    saveSettings();
}

function getGrade(score, mean, stddev, minScore, maxScore) {
    let percentile;
    
    if (!isNaN(minScore) && !isNaN(maxScore)) {
        if (score >= maxScore) {
            percentile = 100;
        } else if (score <= minScore) {
            percentile = 0;
        } else {
            const minPercentile = normalCDF(minScore, mean, stddev);
            const maxPercentile = normalCDF(maxScore, mean, stddev);
            const scorePercentile = normalCDF(score, mean, stddev);
            
            const rangeNormalizedPercentile = (scorePercentile - minPercentile) / (maxPercentile - minPercentile);
            percentile = (1 - rangeNormalizedPercentile) * 100;
        }
    } else {
        percentile = (1 - calculatePercentileWithRange(score, mean, stddev, minScore, maxScore)) * 100;
    }

    for (const band of currentGradeBands) {
        if (percentile >= band.min && percentile <= band.max) {
            return band.grade;
        }
    }

    if (currentGradeBands.length > 0 && percentile < currentGradeBands[currentGradeBands.length - 1].min) {
        return currentGradeBands[currentGradeBands.length - 1].grade;
    }

    return "N/A";
}

function calculateAndDraw() {
    const meanInput = document.getElementById("mean");
    const stddevInput = document.getElementById("stddev");
    const populationInput = document.getElementById("population");
    const scoreInput = document.getElementById("score");
    const minScoreInput = document.getElementById("min-score");
    const maxScoreInput = document.getElementById("max-score");

    const mean = parseFloat(meanInput.value);
    const stddev = parseFloat(stddevInput.value);
    const population = parseInt(populationInput.value);
    const score = parseFloat(scoreInput.value);
    const minScore = parseFloat(minScoreInput.value);
    const maxScore = parseFloat(maxScoreInput.value);

    let isValid = true;
    [meanInput, stddevInput, populationInput, scoreInput, minScoreInput, maxScoreInput].forEach(input => input.classList.remove('border-red-500'));

    if (isNaN(mean)) { meanInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(stddev) || stddev <= 0) { stddevInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(population) || population <= 0) { populationInput.classList.add('border-red-500'); isValid = false; }
    if (isNaN(score)) { scoreInput.classList.add('border-red-500'); isValid = false; }

    if (!isNaN(minScore) && !isNaN(maxScore) && minScore >= maxScore) {
        minScoreInput.classList.add('border-red-500');
        maxScoreInput.classList.add('border-red-500');
        isValid = false;
    }

    if (!isNaN(minScore) && !isNaN(score) && score < minScore) {
        scoreInput.classList.add('border-red-500');
        isValid = false;
    }

    if (!isNaN(maxScore) && !isNaN(score) && score > maxScore) {
        scoreInput.classList.add('border-red-500');
        isValid = false;
    }

    if (!currentGradeBands || currentGradeBands.length === 0) {
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

    // Refresh current bands from editor to ensure we have the latest
    saveSettings();

    let percentile;
    if (!isNaN(minScore) && !isNaN(maxScore)) {
        if (score >= maxScore) {
            percentile = 1.0;
        } else if (score <= minScore) {
            percentile = 0.0;
        } else {
            const minPercentile = normalCDF(minScore, mean, stddev);
            const maxPercentile = normalCDF(maxScore, mean, stddev);
            const scorePercentile = normalCDF(score, mean, stddev);
            const rangeNormalizedPercentile = (scorePercentile - minPercentile) / (maxPercentile - minPercentile);
            percentile = 1 - rangeNormalizedPercentile;
        }
    } else {
        percentile = calculatePercentileWithRange(score, mean, stddev, minScore, maxScore);
    }

    const percentileDisplay = Math.floor(percentile * 100000) / 1000;

    let rank;
    if (!isNaN(minScore) && !isNaN(maxScore)) {
        if (score >= maxScore) {
            rank = 1;
        } else if (score <= minScore) {
            rank = population;
        } else {
            const minPercentile = normalCDF(minScore, mean, stddev);
            const maxPercentile = normalCDF(maxScore, mean, stddev);
            const scorePercentile = normalCDF(score, mean, stddev);
            const rangeNormalizedPercentile = (scorePercentile - minPercentile) / (maxPercentile - minPercentile);
            rank = Math.max(1, Math.ceil((1 - rangeNormalizedPercentile) * population));
        }
    } else {
        rank = Math.max(1, Math.ceil(percentile * population));
    }

    const grade = getGrade(score, mean, stddev, minScore, maxScore);

    document.getElementById("result").innerHTML = `
    🎯 내 점수는 상위 <strong>${percentileDisplay}%</strong>에 해당합니다.<br/>
    📊 예상 등수: <strong>${rank}</strong> / ${population}명 중<br/>
    🏅 예상 학점: <strong class="text-blue-600">${grade !== "N/A" ? grade : "구간 없음"}</strong>
    `;

    drawChart(mean, stddev, score, minScore, maxScore, currentGradeBands, population, showChartType);
    renderGradeTable(currentGradeBands, mean, stddev, population, minScore, maxScore);
}
