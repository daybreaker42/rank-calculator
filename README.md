# Rank Calculator (표준분포 학점 계산기)

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.1.0-green.svg)
![Status](https://img.shields.io/badge/status-active-brightgreen.svg)

> **정규 분포와 절단 정규 분포(Truncated Normal Distribution)를 기반으로 한 프리미엄 학점 및 석차 예측 도구입니다.**  
> Apple의 디자인 철학을 담아 직관적이고 세련된 사용자 경험을 제공합니다.

---

## 주요 기능 (Key Features)

### 정교한 통계 계산
- **정규 분포 기반 예측**: 평균(μ), 표준편차(σ), 전체 인원수를 바탕으로 예상 등수 및 상위 백분율을 즉시 계산합니다.
- **절단 정규 분포 지원**: 시험 점수의 최소/최대 범위(예: 0점~100점)가 정해진 실제 환경에 맞춰 정규화된 분포 모델을 적용합니다.
- **실시간 데이터 시각화**: `Chart.js`를 활용하여 점수 분포도와 나의 위치, 학점 구간을 동적으로 렌더링합니다.

### Apple-Inspired 디자인
- **세련된 UI/UX**: SF Pro 서체(Inter 대체), 카드 기반 레이아웃, 부드러운 애니메이션을 통해 프리미엄 감성을 전달합니다.
- **다크 모드 완벽 지원**: 시스템 설정과 연동되거나 사용자가 직접 선택할 수 있는 다크/라이트 모드 테마를 제공합니다.
- **반응형 레이아웃**: 모바일, 태블릿, 데스크탑 등 모든 디바이스에서 최적화된 화면을 보여줍니다.

### 사용자 맞춤 설정
- **커스텀 학점 구간**: 사용자가 원하는 학점 체계(A+, A0, B+ 등)와 상위 백분율 기준을 자유롭게 편집할 수 있습니다.
- **로컬 스토리지 연동**: 한 번 설정한 학점 구간과 테마 모드는 브라우저를 닫아도 안전하게 저장됩니다.
- **편리한 입력 방식**: Tab 키를 통한 필드 간 빠른 이동 및 화살표 버튼을 이용한 구간 순서 변경 기능을 지원합니다.

---

## 기술적 배경 (Mathematical Background)

본 프로젝트는 단순한 정규 분포를 넘어, 현실 세계의 점수 제한을 반영하기 위해 **절단 정규 분포(Truncated Normal Distribution)** 로직을 구현하였습니다.

### 주요 수식
1. **PDF (Probability Density Function)**:
   $$f(x; \mu, \sigma, a, b) = \frac{\phi(\frac{x-\mu}{\sigma})}{\sigma(\Phi(\frac{b-\mu}{\sigma}) - \Phi(\frac{a-\mu}{\sigma}))}$$
   - 여기서 $\phi$는 표준 정규 분포의 PDF, $\Phi$는 CDF를 의미하며, $a$와 $b$는 각각 최소/최대 점수입니다.

2. **Inverse CDF Approximation**:
   - 백분율 값을 기반으로 정확한 경계 점수를 산출하기 위해 고성능의 수치 해석 근사 알고리즘을 사용합니다.

---

## 기술 스택 (Tech Stack)

| 구분 | 기술 |
| :--- | :--- |
| **Frontend** | HTML5, CSS3 (Vanilla CSS), JavaScript (ES6+ Modules) |
| **Styling** | Custom Design System (Apple-Inspired), Flexbox/Grid |
| **Visualization** | [Chart.js](https://www.chartjs.org/) |
| **Persistence** | Web Storage API (Local Storage) |
| **Design** | Apple SF Pro / Inter Typography, Glassmorphism |

---

## 프로젝트 구조 (Project Structure)

```text
├── functions/           # Cloud Functions (서버 측 집계 로직)
├── src/
│   ├── js/
│   │   ├── app.js       # 애플리케이션 엔트리 포인트 및 이벤트 제어
│   │   ├── math.js      # 통계 및 수학적 계산 로직 (PDF, CDF, Inverse CDF)
│   │   ├── render.js    # UI 렌더링 및 차트 생성 로직
│   │   ├── storage.js   # 로컬 스토리지 데이터 관리
│   │   ├── auth.js      # Firebase 인증 관리
│   │   ├── subject.js   # 과목 상세 및 점수 입력 로직
│   │   └── config.js    # 기본 설정 및 상수 정의
│   └── css/
│       └── style.css    # 전역 스타일 및 디자인 시스템 테마
├── index.html           # 메인 구조 및 시맨틱 마크업
├── firestore.rules      # Firestore 보안 규칙
├── firestore.indexes.json # Firestore 인덱스 설정
├── firebase.json        # Firebase 설정 및 배포 스크립트
├── DESIGN.md            # 상세 디자인 시스템 가이드라인
└── README.md            # 프로젝트 개요 및 문서화
```

---

## 배포 및 인프라 (Deployment & Infrastructure)

본 프로젝트는 Firebase를 기반으로 한 서버리스 아키텍처를 사용하며, 보안과 데이터 무결성을 위해 다음과 같은 설정을 포함합니다.

### 1. Firebase 구성 요소
- **Firestore Security Rules**: `firestore.rules` 파일에 정의되어 있으며, 투표를 완료한 사용자만 상세 통계 데이터를 읽을 수 있도록 제한합니다. 또한 통계 데이터의 직접 쓰기를 차단하여 데이터 오염을 방지합니다.
- **Firestore Indexes**: `firestore.indexes.json` 파일에 복합 쿼리(정렬, 필터링 등)를 위한 인덱스 설정이 포함되어 있습니다.
- **Cloud Functions**: `functions/` 디렉토리에 서버 측 집계 로직이 구현되어 있습니다. 사용자의 투표(점수 입력)가 발생하면 트리거되어 전체 통계(평균, 합계, 분포도)를 안전하게 업데이트합니다.

### 2. 배포 명령어
Firebase CLI가 설치되어 있어야 하며, 배포 전 `firebase login`을 수행해야 합니다.

- **전체 배포 (추천)**:
  ```bash
  firebase deploy
  ```
- **부분 배포**:
  - 보안 규칙만: `firebase deploy --only firestore:rules`
  - 인덱스만: `firebase deploy --only firestore:indexes`
  - 클라우드 함수만: `firebase deploy --only functions`

### 3. 클라우드 함수 관련 주의사항
- **요금제**: Cloud Functions 배포를 위해서는 Firebase 프로젝트가 **Blaze 플랜(종량제)**이어야 합니다. (무료 할당량 내에서는 비용이 발생하지 않습니다.)
- **리전 설정**: 모든 함수는 `asia-northeast3` (서울) 리전에 배포되도록 최적화되어 있습니다.
- **Lint 검사**: 배포 전 `npm run lint`가 자동 실행됩니다. 윈도우 환경에서 배포 시 오류가 발생한다면 `firebase.json`의 `predeploy` 명령어가 `npm --prefix functions run lint`와 같이 윈도우 쉘 호환 경로로 설정되어 있는지 확인하세요.

---

## 시작하기 (Getting Started)

1. **저장소 클론**
   ```bash
   git clone https://github.com/daybreaker42/rank-calculator.git
   ```
2. **Firebase 프로젝트 연결**
   - Firebase Console에서 프로젝트를 생성하고, `src/js/firebase-config.js`에 설정 값을 입력합니다.
3. **로컬 실행**
   - 별도의 빌드 과정 없이 `index.html` 파일을 브라우저에서 직접 열어 실행할 수 있습니다.
   - 로컬 서버(예: VS Code Live Server) 환경에서 실행하는 것을 권장합니다.

---

## 라이선스 (License)

이 프로젝트는 **MIT License** 하에 배포됩니다. 자유롭게 수정 및 배포가 가능합니다.

---

---

## 링크 (Links)

- **만족도 조사 및 개선 제안**: [Google Forms](https://forms.gle/D9Vcg5y2LZNDpLFRA)
- **개발자 후원**: [Buy me a coffee](https://buymeacoffee.com/daybreaker42)

## 기여 (Contributing)

버그 리포트, 기능 제안 및 풀 리퀘스트는 언제나 환영합니다!  
더 나은 계산기를 위해 소중한 의견을 남겨주세요.