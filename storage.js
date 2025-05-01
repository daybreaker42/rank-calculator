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
