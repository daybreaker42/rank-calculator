export const LS_SETTINGS_KEY = "grade-calculator-settings";
export const LS_THEME_KEY = "grade-calculator-theme";

export const defaultGradeBands = [
    { grade: "A+", min: 90, max: 100, color: "rgba(37,99,235,0.2)" },
    { grade: "A0", min: 70, max: 89.99, color: "rgba(56,189,248,0.2)" },
    { grade: "B+", min: 50, max: 69.99, color: "rgba(22,163,74,0.2)" },
    { grade: "B0", min: 30, max: 49.99, color: "rgba(132,204,22,0.2)" },
    { grade: "C+", min: 15, max: 29.99, color: "rgba(234,179,8,0.2)" },
    { grade: "C0", min: 5, max: 14.99, color: "rgba(249,115,22,0.2)" },
    { grade: "D or lower", min: 0, max: 4.99, color: "rgba(220,38,38,0.2)" }
];
