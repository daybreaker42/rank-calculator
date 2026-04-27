import { LS_SETTINGS_KEY, LS_THEME_KEY } from './config.js';

// Settings Storage Functions
export function getStoredSettings() {
    try {
        const savedSettings = localStorage.getItem(LS_SETTINGS_KEY);
        return savedSettings ? JSON.parse(savedSettings) : null;
    } catch (e) {
        console.error("localStorage 접근 중 오류 발생:", e);
        return null;
    }
}

export function saveStoredSettings(settings) {
    try {
        localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error("localStorage 저장 중 오류 발생:", e);
        alert("설정을 저장하는 중 오류가 발생했습니다. 브라우저 저장 공간이 부족하거나 설정을 확인해주세요.");
    }
}

export function clearAllStoredData() {
    localStorage.removeItem(LS_SETTINGS_KEY);
    localStorage.removeItem('gradeBands');
    localStorage.removeItem('lastInputs');
}

// Theme Functions
export function getStoredTheme() {
    try {
        return localStorage.getItem(LS_THEME_KEY);
    } catch (e) {
        console.error("테마 설정 불러오기 중 오류 발생:", e);
        return null;
    }
}

export function saveStoredTheme(isDarkMode) {
    try {
        localStorage.setItem(LS_THEME_KEY, isDarkMode ? "dark" : "light");
    } catch (e) {
        console.error("테마 설정 저장 중 오류 발생:", e);
    }
}

export function applyTheme(isDarkMode) {
    if (isDarkMode) {
        document.documentElement.classList.add('dark');
        const darkIcon = document.getElementById('theme-toggle-dark-icon');
        const lightIcon = document.getElementById('theme-toggle-light-icon');
        if (darkIcon) darkIcon.classList.add('hidden');
        if (lightIcon) lightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        const darkIcon = document.getElementById('theme-toggle-dark-icon');
        const lightIcon = document.getElementById('theme-toggle-light-icon');
        if (lightIcon) lightIcon.classList.add('hidden');
        if (darkIcon) darkIcon.classList.remove('hidden');
    }
}

export function toggleTheme() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const newDarkMode = !isDarkMode;
    applyTheme(newDarkMode);
    saveStoredTheme(newDarkMode);
    return newDarkMode;
}

export function initTheme() {
    const savedTheme = getStoredTheme();
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDarkMode = savedTheme ? savedTheme === "dark" : prefersDark;
    
    applyTheme(isDarkMode);
    
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!getStoredTheme()) {
            applyTheme(e.matches);
        }
    });
}
