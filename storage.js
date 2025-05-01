// localStorage에서 설정 불러오기 함수
const LS_SETTINGS_KEY = "grade-calculator-settings"; // 설정 저장용 키 상수
const LS_THEME_KEY = "grade-calculator-theme"; // 테마 설정 저장용 키 상수 (추가)

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
        
        // 테마 설정 불러오기 (추가)
        loadThemeSettings();
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

// 테마 설정 저장 함수 (다크모드/라이트모드) (추가)
function saveThemeSettings(isDarkMode) {
    try {
        localStorage.setItem(LS_THEME_KEY, isDarkMode ? "dark" : "light");
    } catch (e) {
        console.error("테마 설정 저장 중 오류 발생:", e);
    }
}

// 테마 설정 불러오기 함수 (추가)
function loadThemeSettings() {
    try {
        // 시스템 설정 우선 확인
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        // 저장된 테마 설정 확인
        const savedTheme = localStorage.getItem(LS_THEME_KEY);
        
        // 저장된 설정이 있으면 그것을 우선 적용, 없으면 시스템 설정 따르기
        const isDarkMode = savedTheme ? savedTheme === "dark" : prefersDark;
        
        // 테마 적용
        setTheme(isDarkMode);
        
        // 미디어 쿼리 변경 시 자동 테마 업데이트 (시스템 설정 변경 시)
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            // 저장된 설정이 없을 경우만 시스템 설정에 따라 변경
            if (!localStorage.getItem(LS_THEME_KEY)) {
                setTheme(e.matches);
            }
        });
    } catch (e) {
        console.error("테마 설정 불러오기 중 오류 발생:", e);
    }
}

// 테마 설정 적용 함수 (추가)
function setTheme(isDarkMode) {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        document.getElementById('theme-toggle-dark-icon').classList.add('hidden');
        document.getElementById('theme-toggle-light-icon').classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        document.getElementById('theme-toggle-light-icon').classList.add('hidden');
        document.getElementById('theme-toggle-dark-icon').classList.remove('hidden');
    }
}

// 테마 토글 함수 (추가)
function toggleTheme() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    setTheme(!isDarkMode);
    saveThemeSettings(!isDarkMode);
}

// 테마 토글 버튼 이벤트 리스너 설정 (추가)
document.addEventListener('DOMContentLoaded', function() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', toggleTheme);
    }
});
