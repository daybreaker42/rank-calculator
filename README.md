# 표준분포 학점 계산기

이 프로젝트는 사용자가 입력한 평균, 표준편차, 인원수, 내 점수를 바탕으로 표준분포 상에서 예상 학점, 등수, 상위 백분율, 그리고 학점 구간별 경계값과 상위 백분율을 시각적으로 제공합니다.

## 주요 기능
- 평균, 표준편차, 인원수, 내 점수 입력
- 내 점수의 예상 학점, 등수, 상위 백분율 계산
- 표준분포 그래프 시각화(Chart.js)
- 학점 구간별 경계값 및 상위 백분율 표 제공
- 반응형 디자인(Tailwind CSS)

## 사용법
1. `index.html`을 브라우저에서 엽니다.
2. 평균, 표준편차, 인원수, 내 점수를 입력합니다.
3. [계산하기] 버튼을 누르면 결과와 그래프, 학점 구간별 표가 표시됩니다.

## 기술 스택
- HTML/CSS (Tailwind CSS)
- JavaScript (Vanilla JS)
- Chart.js (그래프 시각화)

## 라이선스
MIT License

## 참고 자료
- [Chart.js 공식 문서](https://www.chartjs.org/docs/latest/)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs/)
- [GitHub Docs: README 작성법](https://docs.github.com/en/get-started/quickstart/README)

## 기여
이슈 및 PR은 언제든 환영합니다.

---

### 추가하면 좋을 기능 제안
- 학점 구간 커스터마이즈(사용자가 직접 구간/점수 설정)
- 입력값 저장 및 불러오기(로컬스토리지 활용)
- 결과 PDF/이미지로 내보내기
- 다중 과목 입력 및 비교 기능
- 접근성(Accessibility) 향상: aria-label, 키보드 네비게이션 등
