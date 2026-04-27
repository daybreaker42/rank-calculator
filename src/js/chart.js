import { 
    normalInverseCDF, 
    truncatedNormalPDF, 
    truncatedNormalCDF, 
    normalPDF, 
    normalCDF, 
    computeScorePercentileRangeWithLimits, 
    calculatePercentileWithRange 
} from './math.js';

let chart = null;
export let lastChartData = null;

export function drawChart(mean, stddev, score, minScore, maxScore, currentBands, population, showChartType) {
    const ctx = document.getElementById("chartCanvas").getContext("2d");
    
    const isDarkMode = document.documentElement.classList.contains('dark');
    const showPercentile = showChartType === 'percentile';

    let minDataScore = mean - 4 * stddev;
    let maxDataScore = mean + 4 * stddev;

    if (!isNaN(minScore)) {
        minDataScore = Math.max(minDataScore, minScore);
    }
    if (!isNaN(maxScore)) {
        maxDataScore = Math.min(maxDataScore, maxScore);
    }

    const stepCount = 50;
    const step = (maxDataScore - minDataScore) / stepCount;

    const data = [];

    if (showPercentile) {
        const percentileStep = 100 / stepCount;
        for (let percentile = 0; percentile <= 100; percentile += percentileStep) {
            let p = 1 - (percentile / 100);
            p = Math.max(0.0001, Math.min(0.9999, p));

            let x;
            if (!isNaN(minScore) && !isNaN(maxScore)) {
                const originalX = normalInverseCDF(p, mean, stddev);
                x = Math.max(minScore, Math.min(maxScore, originalX));
            } else {
                x = normalInverseCDF(p, mean, stddev);
            }

            if (x >= minDataScore && x <= maxDataScore) {
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
        for (let x = minDataScore; x <= maxDataScore; x += step) {
            const density = !isNaN(minScore) && !isNaN(maxScore)
                ? truncatedNormalPDF(x, mean, stddev, minScore, maxScore)
                : normalPDF(x, mean, stddev);

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

    const labels = data.map(d => showPercentile ? d.percentile : d.score);
    const chartData = data.map(d => d.count);

    const bandPlugin = {
        id: 'gradeBands',
        beforeDatasetsDraw(chartInstance) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chartInstance;

            currentBands.forEach((band, index) => {
                ctx.fillStyle = band.color;

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
                    xMin = x.getPixelForValue(minScoreVal);
                    xMax = x.getPixelForValue(maxScoreVal);
                    bandLabel = `${band.grade}\n(${minScoreVal.toFixed(0)}점~${maxScoreVal.toFixed(0)}점)`;
                }

                const width = Math.abs(xMax - xMin);

                if (width > 0) {
                    const displayMin = Math.min(xMin, xMax);
                    ctx.fillRect(displayMin, top, width, bottom - top);

                    ctx.save();
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

    const scoreLinePlugin = {
        id: 'userScoreLine',
        afterDatasetsDraw(chartInstance) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chartInstance;

            let adjustedPercentile = calculatePercentileWithRange(score, mean, stddev, minScore, maxScore) * 100;

            const xPos = x.getPixelForValue(showPercentile ? adjustedPercentile : score);

            if (xPos < chartInstance.chartArea.left || xPos > chartInstance.chartArea.right) {
                return;
            }

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(xPos, top);
            ctx.lineTo(xPos, bottom);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = 'red';
            ctx.textAlign = 'center';
            ctx.font = '12px Arial';

            const scoreText = `${score}점`;
            const percentileText = `상위 ${adjustedPercentile.toFixed(1)}%`;

            ctx.fillText(scoreText, xPos, top - 20);
            ctx.fillText(percentileText, xPos, top - 5);

            ctx.restore();
        }
    };

    const scoreLimitPlugin = {
        id: 'scoreLimits',
        afterDatasetsDraw(chartInstance) {
            const { ctx, chartArea: { top, bottom }, scales: { x } } = chartInstance;

            if (!isNaN(minScore) && showChartType === 'score') {
                const minXPos = x.getPixelForValue(minScore);
                if (minXPos >= chartInstance.chartArea.left && minXPos <= chartInstance.chartArea.right) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(minXPos, top);
                    ctx.lineTo(minXPos, bottom);
                    ctx.strokeStyle = 'rgba(255, 99, 132, 0.8)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();

                    ctx.fillStyle = 'rgba(255, 99, 132, 0.8)';
                    ctx.textAlign = 'center';
                    ctx.font = '10px Arial';
                    ctx.fillText(`최소: ${minScore}점`, minXPos, bottom + 15);
                    ctx.restore();
                }
            }

            if (!isNaN(maxScore) && showChartType === 'score') {
                const maxXPos = x.getPixelForValue(maxScore);
                if (maxXPos >= chartInstance.chartArea.left && maxXPos <= chartInstance.chartArea.right) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(maxXPos, top);
                    ctx.lineTo(maxXPos, bottom);
                    ctx.strokeStyle = 'rgba(54, 162, 235, 0.8)';
                    ctx.lineWidth = 1;
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();

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
    
    // Check if Chart is available globally
    if (typeof Chart !== 'undefined') {
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
                                if (showPercentile) {
                                    const rangeStart = value - (step / 2);
                                    const rangeEnd = value + (step / 2);
                                    return `상위 ${rangeStart.toFixed(1)}% ~ ${rangeEnd.toFixed(1)}% 구간`;
                                } else {
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
    }

    lastChartData = { mean, stddev, score, minScore, maxScore };
}

export function destroyChart() {
    if (chart) {
        chart.destroy();
        chart = null;
    }
}
