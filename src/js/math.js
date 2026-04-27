export function normalPDF(x, mean, stddev) {
    const exponent = -0.5 * Math.pow((x - mean) / stddev, 2);
    return (1 / (stddev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}
  
export function normalCDF(x, mean, stddev) {
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

export function normalInverseCDF(p, mean = 0, stddev = 1) {
    if (p <= 0 || p >= 1) {
        console.error(`parameter out of bounds: ${p}`);
        throw new Error("p must be between 0 and 1 (exclusive)");
    }
  
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

export function computeScorePercentileRange(mean, stddev, bandMax, bandMin){
    const topPercentile = 100 - bandMax;
    const nextTopPercentile = 100 - bandMin;
    
    const p1 = Math.min(0.9999, bandMax / 100);
    const p2 = Math.max(0.0001, bandMin / 100);

    const maxScore = normalInverseCDF(p1, mean, stddev);
    const minScore = normalInverseCDF(p2, mean, stddev);
    
    const roundedTopPercentile = parseFloat(topPercentile.toFixed(2));
    const roundedNextTopPercentile = parseFloat(nextTopPercentile.toFixed(2));
    const roundedMinScore = parseFloat(minScore.toFixed(2));
    const roundedMaxScore = parseFloat(maxScore.toFixed(2));

    return [roundedTopPercentile, roundedNextTopPercentile, roundedMinScore, roundedMaxScore];
}

export function truncatedNormalPDF(x, mean, stddev, minScore, maxScore) {
  if (x < minScore || x > maxScore) return 0;
  const pdf = normalPDF(x, mean, stddev);
  const normalizingConstant = normalCDF(maxScore, mean, stddev) - normalCDF(minScore, mean, stddev);
  return normalizingConstant > 0 ? pdf / normalizingConstant : 0;
}

export function truncatedNormalCDF(x, mean, stddev, minScore, maxScore) {
  if (x <= minScore) return 0;
  if (x >= maxScore) return 1;

  const originalCDF = normalCDF(x, mean, stddev);
  const minCDF = normalCDF(minScore, mean, stddev);
  const maxCDF = normalCDF(maxScore, mean, stddev);

  return (originalCDF - minCDF) / (maxCDF - minCDF);
}

export function calculatePercentileWithRange(score, mean, stddev, minScore, maxScore) {
  if (isNaN(minScore) || isNaN(maxScore)) {
    return 1 - normalCDF(score, mean, stddev);
  }
  const truncatedCDF = truncatedNormalCDF(score, mean, stddev, minScore, maxScore);
  return 1 - truncatedCDF;
}

export function computeScorePercentileRangeWithLimits(mean, stddev, bandMax, bandMin, minScore, maxScore) {
  const topPercentile = 100 - bandMax;
  const nextTopPercentile = 100 - bandMin;

  const roundedTopPercentile = parseFloat(topPercentile.toFixed(2));
  const roundedNextTopPercentile = parseFloat(nextTopPercentile.toFixed(2));

  const p1 = Math.min(0.9999, bandMax / 100);
  const p2 = Math.max(0.0001, bandMin / 100);

  let minScoreVal, maxScoreVal;

  if (isNaN(minScore) || isNaN(maxScore)) {
    maxScoreVal = normalInverseCDF(p1, mean, stddev);
    minScoreVal = normalInverseCDF(p2, mean, stddev);
  } else {
    const minCDF = normalCDF(minScore, mean, stddev);
    const maxCDF = normalCDF(maxScore, mean, stddev);

    const originalCDF_max = p1 * (maxCDF - minCDF) + minCDF;
    const originalCDF_min = p2 * (maxCDF - minCDF) + minCDF;

    const safe_originalCDF_max = Math.max(0.0001, Math.min(0.9999, originalCDF_max));
    const safe_originalCDF_min = Math.max(0.0001, Math.min(0.9999, originalCDF_min));

    maxScoreVal = normalInverseCDF(safe_originalCDF_max, mean, stddev);
    minScoreVal = normalInverseCDF(safe_originalCDF_min, mean, stddev);
    
    maxScoreVal = Math.min(maxScore, Math.max(minScore, maxScoreVal));
    minScoreVal = Math.min(maxScore, Math.max(minScore, minScoreVal));
  }

  return [roundedTopPercentile, roundedNextTopPercentile, parseFloat(minScoreVal.toFixed(2)), parseFloat(maxScoreVal.toFixed(2))];
}
