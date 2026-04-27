# 🍎 Rank Calculator (표준분포 학점 계산기)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.1.0-green.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

> **정규 분포와 절단 정규 분포(Truncated Normal Distribution)를 기반으로 한 프리미엄 학점 및 석차 예측 도구입니다.**  
> Apple의 디자인 철학을 담아 직관적이고 세련된 사용자 경험을 제공합니다.

---

## ✨ 주요 기능 (Key Features)

### 📊 정교한 통계 계산
- **정규 분포 기반 예측**: 평균(μ), 표준편차(σ), 전체 인원수를 바탕으로 예상 등수 및 상위 백분율을 즉시 계산합니다.
- **절단 정규 분포 지원**: 시험 점수의 최소/최대 범위(예: 0점~100점)가 정해진 실제 환경에 맞춰 정규화된 분포 모델을 적용합니다.
- **실시간 데이터 시각화**: `Chart.js`를 활용하여 점수 분포도와 나의 위치, 학점 구간을 동적으로 렌더링합니다.

### 🎨 Apple-Inspired 디자인
- **세련된 UI/UX**: SF Pro 서체(Inter 대체), 카드 기반 레이아웃, 부드러운 애니메이션을 통해 프리미엄 감성을 전달합니다.
- **다크 모드 완벽 지원**: 시스템 설정과 연동되거나 사용자가 직접 선택할 수 있는 다크/라이트 모드 테마를 제공합니다.
- **반응형 레이아웃**: 모바일, 태블릿, 데스크탑 등 모든 디바이스에서 최적화된 화면을 보여줍니다.

### ⚙️ 사용자 맞춤 설정
- **커스텀 학점 구간**: 사용자가 원하는 학점 체계(A+, A0, B+ 등)와 상위 백분율 기준을 자유롭게 편집할 수 있습니다.
- **로컬 스토리지 연동**: 한 번 설정한 학점 구간과 테마 모드는 브라우저를 닫아도 안전하게 저장됩니다.
- **편리한 입력 방식**: Tab 키를 통한 필드 간 빠른 이동 및 화살표 버튼을 이용한 구간 순서 변경 기능을 지원합니다.

---

## 📐 기술적 배경 (Mathematical Background)

본 프로젝트는 단순한 정규 분포를 넘어, 현실 세계의 점수 제한을 반영하기 위해 **절단 정규 분포(Truncated Normal Distribution)** 로직을 구현하였습니다.

### 주요 수식
1. **PDF (Probability Density Function)**:
   $$f(x; \mu, \sigma, a, b) = \frac{\phi(\frac{x-\mu}{\sigma})}{\sigma(\Phi(\frac{b-\mu}{\sigma}) - \Phi(\frac{a-\mu}{\sigma}))}$$
   - 여기서 $\phi$는 표준 정규 분포의 PDF, $\Phi$는 CDF를 의미하며, $a$와 $b$는 각각 최소/최대 점수입니다.

2. **Inverse CDF Approximation**:
   - 백분율 값을 기반으로 정확한 경계 점수를 산출하기 위해 고성능의 수치 해석 근사 알고리즘을 사용합니다.

---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 기술 |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Vanilla CSS), JavaScript (ES6+ Modules) |
| **Styling** | Custom Design System (Apple-Inspired), Flexbox/Grid |
| **Visualization** | [Chart.js](https://www.chartjs.org/) |
| **Persistence** | Web Storage API (Local Storage) |
| **Design** | Apple SF Pro / Inter Typography, Glassmorphism |

---

## 📂 프로젝트 구조 (Project Structure)

```text
41_rank-calculator/
├── src/
│   ├── js/
│   │   ├── app.js       # 애플리케이션 엔트리 포인트 및 이벤트 제어
│   │   ├── math.js      # 통계 및 수학적 계산 로직 (PDF, CDF, Inverse CDF)
│   │   ├── render.js    # UI 렌더링 및 차트 생성 로직
│   │   ├── storage.js   # 로컬 스토리지 데이터 관리
│   │   └── config.js    # 기본 설정 및 상수 정의
│   └── css/
│       └── style.css    # 전역 스타일 및 디자인 시스템 테마
├── index.html           # 메인 구조 및 시맨틱 마크업
├── DESIGN.md            # 상세 디자인 시스템 가이드라인
└── README.md            # 프로젝트 개요 및 문서화
```

---

## 🚀 시작하기 (Getting Started)

1. **저장소 클론**
   ```bash
   git clone https://github.com/daybreaker42/rank-calculator.git
   ```
2. **파일 실행**
   - 별도의 빌드 과정 없이 `index.html` 파일을 브라우저에서 직접 열어 실행할 수 있습니다.
   - 로컬 서버(예: Live Server) 환경에서 실행하는 것을 권장합니다.

---

## 📝 라이선스 (License)

이 프로젝트는 **MIT License** 하에 배포됩니다. 자유롭게 수정 및 배포가 가능합니다.

---

---

## 🔗 링크 (Links)

- **만족도 조사 및 개선 제안**: [Google Forms](https://forms.gle/D9Vcg5y2LZNDpLFRA)
- **개발자 후원**: [Buy me a coffee](https://buymeacoffee.com/daybreaker42)

## 🤝 기여 (Contributing)

버그 리포트, 기능 제안 및 풀 리퀘스트는 언제나 환영합니다!  
더 나은 계산기를 위해 소중한 의견을 남겨주세요.