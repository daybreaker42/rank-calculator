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

function normalInverseCDF(p, mean = 0, stddev = 1) {
    if (p <= 0 || p >= 1) {
        console.error(`parameter out of bounds: ${p}`); // 오류 로깅
      throw new Error("p must be between 0 and 1 (exclusive)");
    }
  
    // Constants for approximation
    const a1 = -39.69683028665376, a2 = 220.9460984245205;
    const a3 = -275.9285104469687, a4 = 138.3577518672690;
    const a5 = -30.66479806614716, a6 = 2.506628277459239;
  
    const b1 = -54.47609879822406, b2 = 161.5858368580409;
    const b3 = -155.6989798598866, b4 = 66.80131188771972;
    const b5 = -13.28068155288572;
  
    const c1 = -0.007784894002430293, c2 = -0.3223964580411365;
    const c3 = -2.400758277161838, c4 = -2.549732539343734;
    const c5 = 4.374664141464968, c6 = 2.938163982698783;
  
    const d1 = 0.007784695709041462, d2 = 0.3224671290700398;
    const d3 = 2.445134137142996, d4 = 3.754408661907416;
  
    // Define break-points.
    const plow = 0.02425;
    const phigh = 1 - plow;
  
    let q, r;
    let result;
  
    if (p < plow) {
      q = Math.sqrt(-2 * Math.log(p));
      result = (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
               ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    } else if (p <= phigh) {
      q = p - 0.5;
      r = q * q;
      result = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
               (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      result = -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
                ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
    }
  
    return mean + stddev * result;
  }
  

// 백분율에 따른 점수 범위 계산 함수 (주석: 학점 구간에 따라 점수 범위를 계산)
// mean: 평균, stddev: 표준편차, bandMax: 현재 구간의 최대 백분율, bandMin: 다음 구간의 최소 백분율
function computeScorePercentileRange(mean, stddev, bandMax, bandMin){
    // 현재 구간의 상위 백분율 계산
    const topPercentile = 100 - bandMax;
    // 다음 구간의 상위 백분율 계산
    const nextTopPercentile = 100 - bandMin;
    
    // 백분율을 기반으로 실제 점수 계산, 0 < p < 1 범위로 변환
    const p1 = Math.min(0.9999, bandMax / 100); // 현재 구간의 백분율을 0~1 범위로 변환
    const p2 = Math.max(0.0001, bandMin / 100); // 다음 구간의 백분율을 0~1 범위로 변환

    // 역정규분포를 사용하여 점수 계산
    const maxScore = normalInverseCDF(p1, mean, stddev);
    const minScore = normalInverseCDF(p2, mean, stddev);
    
    // 계산된 값들을 소수점 두 자리까지 반올림
    const roundedTopPercentile = parseFloat(topPercentile.toFixed(2));
    const roundedNextTopPercentile = parseFloat(nextTopPercentile.toFixed(2));
    const roundedMinScore = parseFloat(minScore.toFixed(2));
    const roundedMaxScore = parseFloat(maxScore.toFixed(2));

    return [roundedTopPercentile, roundedNextTopPercentile, roundedMinScore, roundedMaxScore];
}

// 범위 제한을 적용한 정규분포 함수들 추가
function truncatedNormalPDF(x, mean, stddev, minScore, maxScore) {
  // 범위를 벗어나면 0 반환
  if (x < minScore || x > maxScore) return 0;

  // 기본 정규분포 확률밀도함수 계산
  const pdf = normalPDF(x, mean, stddev);

  // 전체 분포 중 minScore~maxScore 사이의 확률만 남김
  const normalizingConstant = normalCDF(maxScore, mean, stddev) - normalCDF(minScore, mean, stddev);

  // 정규화된 확률밀도 반환
  return normalizingConstant > 0 ? pdf / normalizingConstant : 0;
}

function truncatedNormalCDF(x, mean, stddev, minScore, maxScore) {
  // 범위를 벗어나는 경우 처리
  if (x <= minScore) return 0;
  if (x >= maxScore) return 1;

  // 원래 분포의 CDF 계산
  const originalCDF = normalCDF(x, mean, stddev);
  const minCDF = normalCDF(minScore, mean, stddev);
  const maxCDF = normalCDF(maxScore, mean, stddev);

  // 범위 내에서 정규화된 CDF 값 계산
  return (originalCDF - minCDF) / (maxCDF - minCDF);
}

// 점수 범위를 고려한 백분위수 계산 함수
function calculatePercentileWithRange(score, mean, stddev, minScore, maxScore) {
  // 범위 제한이 설정되지 않은 경우
  if (isNaN(minScore) || isNaN(maxScore)) {
    return 1 - normalCDF(score, mean, stddev);
  }

  // 범위 제한이 있는 경우 조정된 백분위수 계산
  const truncatedCDF = truncatedNormalCDF(score, mean, stddev, minScore, maxScore);
  return 1 - truncatedCDF;
}

// 범위를 고려한 점수-백분위 변환 함수
function computeScorePercentileRangeWithLimits(mean, stddev, bandMax, bandMin, minScore, maxScore) {
  // 기본 계산 결과 가져오기
  const [topPercentile, nextTopPercentile, calculatedMaxScore, calculatedMinScore] =
    computeScorePercentileRange(mean, stddev, bandMax, bandMin);

  // 범위 제한이 없으면 기존 결과 반환
  if (isNaN(minScore) || isNaN(maxScore)) {
    return [topPercentile, nextTopPercentile, calculatedMinScore, calculatedMaxScore];
  }

  // 범위 제한 적용
  const limitedMinScore = Math.max(calculatedMinScore, minScore);
  const limitedMaxScore = Math.min(calculatedMaxScore, maxScore);

  return [topPercentile, nextTopPercentile, limitedMinScore, limitedMaxScore];
}