# 정치 발언 모순 탐지기 디자인 제안서

## 0. 추천 디자인 한 줄 요약

**추천안: Evidence Desk Dashboard**  
정치적 공격 도구처럼 보이지 않게, “판정”보다 **근거·출처·맥락**을 먼저 보여주는 중립형 저널리즘 검증 대시보드.

이 서비스는 정치인의 현재 발언을 과거 발언과 대조하는 **자기 일관성 축**과, 통계·웹 출처로 사실 여부를 확인하는 **사실성 축**을 분리해서 보여줘야 한다. 따라서 UI도 감정적 경고 화면이 아니라, 뉴스룸의 팩트체크 데스크처럼 차분하고 신뢰감 있게 설계한다.

---

## 1. 디자인 방향

### 핵심 키워드

- **Neutral**: 진영·정치색이 느껴지지 않는 색상과 문구
- **Evidence-first**: 결과보다 근거와 출처를 먼저 신뢰하게 만드는 구조
- **Explainable AI**: AI가 왜 그렇게 판단했는지 한눈에 보이게 함
- **Journalism Tool**: 일반 소비자 앱보다 기자·심사위원이 납득할 수 있는 검증 도구 느낌
- **Hackathon Demo Ready**: 2일 안에 구현 가능한 컴포넌트 중심 설계

### 피해야 할 디자인

- 빨강/파랑을 정당 색처럼 쓰는 디자인
- “거짓말 탐지기”, “정치인 참교육”처럼 공격적인 카피
- 결과 점수만 크게 보여주는 선정적 UI
- 출처가 카드 아래에 작게 숨겨지는 구조
- AI가 단정적으로 말하는 듯한 문구

---

## 2. 비주얼 콘셉트

### 콘셉트명

**Evidence Desk / 검증 데스크**

### 화면 분위기

- 깨끗한 공공 데이터 포털 + 뉴스룸 편집 데스크 + AI 분석 대시보드의 조합
- 밝은 배경, 낮은 채도의 색상, 선명한 카드 구분
- “정치 앱”보다는 “팩트체크 도구”처럼 보이게 설계

### 추천 컬러 팔레트

```css
:root {
  --background: #F7F8FA;
  --surface: #FFFFFF;
  --surface-muted: #F1F4F8;
  --text-primary: #111827;
  --text-secondary: #4B5563;
  --text-muted: #6B7280;

  --navy: #172033;
  --blue: #2563EB;
  --green: #16A34A;
  --amber: #D97706;
  --red: #DC2626;
  --gray-line: #E5E7EB;

  --consistency: #2563EB;
  --factuality: #16A34A;
  --warning: #D97706;
  --danger: #DC2626;
}
```

### 색상 사용 규칙

| 용도 | 색상 | 사용 방식 |
|---|---:|---|
| 자기 일관성 | Blue | 과거 발언 대조, 모순/일치 배지 |
| 사실성 | Green | 팩트체크, 출처 기반 검증 배지 |
| 검증불가 | Amber | 데이터 부족, 맥락 부족, 판단 보류 |
| 명확한 오류/모순 | Red | 너무 과하게 쓰지 말고 배지·아이콘에만 제한 |
| 기본 UI | Navy/Gray | 제목, 본문, 카드, 표, 경계선 |

### 폰트

- 한국어/영어 공통: `Pretendard`, `Inter`, `system-ui`
- 숫자·시간·점수: `Inter` 또는 `JetBrains Mono`
- 코드/출처/타임스탬프: `JetBrains Mono`

```css
font-family: Pretendard, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
```

---

## 3. 정보 구조

### 전체 사용자 흐름

```text
Landing / Hero
  ↓
정치인 선택
  ↓
영상 또는 대본 업로드
  ↓
STT 변환 및 발언 추출
  ↓
AI 분석 진행 상태
  ↓
결과 대시보드
  ↓
발언 카드 상세 근거 확인
```

### 메인 화면 섹션

1. **Hero Section**
   - 서비스 이름
   - 한 줄 설명
   - “두 축 분리 검증”을 강조하는 미니 다이어그램

2. **Input Panel**
   - 정치인 선택
   - 영상 업로드
   - 대본 업로드 폴백
   - 데모 샘플 버튼

3. **Analysis Progress**
   - STT 변환 중
   - 발언 추출 중
   - 과거 발언 대조 중
   - 공식 통계/웹 출처 검증 중
   - 결과 생성 중

4. **Result Dashboard**
   - 일관성 점수 게이지
   - 정확성 점수 게이지
   - 분석된 발언 수
   - 모순 의심 발언 수
   - 검증불가 발언 수

5. **Statement Cards**
   - 발언 원문
   - 타임스탬프
   - 일관성 배지
   - 사실성 배지
   - 신뢰도
   - 출처 링크
   - 클릭 시 상세 근거 펼침

6. **Evidence Drawer / Detail Panel**
   - 현재 발언
   - 비교된 과거 발언
   - 날짜·출처
   - 판단 이유
   - 공식 통계 또는 웹 출처
   - “AI 초벌, 인간 최종 검증 필요” 안내

---

## 4. 화면 설계

## 4-1. 랜딩 / 업로드 화면

### 목적

심사위원이 첫 화면만 보고도 이 앱이 무엇을 하는지 이해해야 한다.

### 레이아웃

```text
┌─────────────────────────────────────────────────────┐
│ Header                                              │
│ Logo        How it works     Demo     Sources       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Political Statement Contradiction Detector          │
│  정치 발언을 두 축으로 검증합니다.                    │
│                                                     │
│  [자기 일관성] 본인의 과거 발언과 충돌하는가?          │
│  [사실성] 공식 통계와 신뢰 출처로 확인되는가?          │
│                                                     │
│  [영상 업로드] [대본으로 데모 실행]                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Three-step cards                                   │
│  1. Upload → 2. Extract Claims → 3. Verify Evidence │
└─────────────────────────────────────────────────────┘
```

### Hero 카피

```text
정치 발언을 ‘공격’이 아니라 ‘검증’합니다.

영상 속 발언을 추출하고, 본인의 과거 발언과 공식 출처를 기준으로
자기 일관성과 사실성을 분리해 보여주는 AI 저널리즘 도구입니다.
```

### CTA 버튼

- Primary: `대본으로 빠른 데모 실행`
- Secondary: `영상 업로드하기`
- Tertiary: `샘플 결과 보기`

---

## 4-2. 업로드 패널

### 구성 요소

- 정치인 선택 드롭다운
- 파일 업로드 드래그 앤 드롭
- 대본 직접 붙여넣기 탭
- 분석 시작 버튼
- STT 실패 시 안내문

### 문구

```text
영상 업로드가 실패해도 괜찮습니다.
대본을 직접 입력하면 동일한 분석 파이프라인으로 데모를 진행할 수 있습니다.
```

### UI 상태

- Empty: 파일 없음
- Uploaded: 파일명, 크기, 길이 표시
- Transcribing: 진행률 표시
- Fallback: 대본 입력 탭 강조
- Error: “영상 변환 실패. 대본 입력으로 전환할 수 있습니다.”

---

## 4-3. 분석 진행 화면

### 목적

AI가 무엇을 하는지 투명하게 보여준다.

```text
분석 중
[✓] 음성에서 발언 추출
[✓] 검증 가능한 주장 분류
[...] 과거 발언 DB와 대조
[...] 공식 통계/웹 출처 확인
[ ] 결과 대시보드 생성
```

### 추천 컴포넌트

- Stepper
- Skeleton card
- Progress timeline
- 작은 로그 패널

### 문구

```text
모순과 사실성은 서로 다른 기준으로 판정됩니다.
정치적 입장이나 가치판단은 팩트체크 대상에서 제외됩니다.
```

---

## 4-4. 결과 대시보드

### 상단 요약 카드

```text
┌─────────────────────────────────────────────────────┐
│ 분석 결과 요약                                      │
│                                                     │
│  일관성 점수        정확성 점수        검증 발언 수  │
│  72%                64%                18           │
│                                                     │
│  모순 의심 5건      거짓 3건           검증불가 4건  │
└─────────────────────────────────────────────────────┘
```

### 점수 표시 방식

- 원형 게이지보다 **수평 게이지 + 숫자** 추천
- 이유: 해커톤 구현이 쉽고, 두 점수를 나란히 비교하기 좋음

### 점수 문구

- 일관성 점수: `과거 발언과 충돌하지 않은 비율`
- 정확성 점수: `검증 가능한 사실 주장 중 사실로 확인된 비율`

---

## 4-5. 발언 카드

### 카드 기본 구조

```text
┌─────────────────────────────────────────────────────┐
│ 00:01:24  발언 #03                                  │
│ “청년 실업률은 지난 정부보다 두 배 이상 낮아졌습니다.” │
│                                                     │
│ [일관성: 모순 의심] [사실성: 거짓] [신뢰도 0.82]       │
│                                                     │
│ 근거 2개 · 과거 발언 1개 · 공식 통계 사용              │
│                                                     │
│ [상세 근거 보기]                                     │
└─────────────────────────────────────────────────────┘
```

### 배지 규칙

#### 일관성 배지

| 상태 | 라벨 | 색상 |
|---|---|---|
| 과거 발언과 일치 | 일관성 유지 | Blue/Soft |
| 과거 발언과 충돌 | 모순 의심 | Red/Soft |
| 비교 자료 부족 | 판단 보류 | Gray/Amber |

#### 사실성 배지

| 상태 | 라벨 | 색상 |
|---|---|---|
| TRUE | 사실 확인 | Green |
| FALSE | 사실과 다름 | Red |
| UNVERIFIABLE | 검증불가 | Amber |
| isFactualClaim=false | 의견/가치판단 | Gray |

### 카드 우선순위

결과 목록은 기본적으로 다음 순서로 정렬한다.

1. 모순 의심 + 거짓
2. 모순 의심
3. 거짓
4. 검증불가
5. 문제 없음

---

## 4-6. 상세 근거 패널

### 목적

“왜 AI가 이렇게 판단했는지” 설명한다.

### 구조

```text
상세 근거

현재 발언
“...”

자기 일관성 분석
- 판정: 모순 의심
- 비교된 과거 발언: “...”
- 발언 날짜: 2024-03-12
- 출처: 방송/기사 링크
- 판단 이유: ...

사실성 분석
- 판정: FALSE
- 사용 출처: KOSIS / INSEE / Web
- 근거 요약: ...
- 출처 링크: ...

주의
이 결과는 AI 기반 1차 분석이며, 최종 보도나 공개 검증에는 사람의 확인이 필요합니다.
```

### 상세 패널 추천 형태

- 데스크톱: 오른쪽 drawer
- 모바일: 카드 하단 accordion
- 해커톤 데모: 카드 하단 accordion이 구현 쉬움

---

## 5. 컴포넌트 목록

### 필수 컴포넌트

```text
/components
  /layout
    Header.tsx
    PageShell.tsx
  /upload
    UploadPanel.tsx
    TranscriptInput.tsx
    PoliticianSelect.tsx
  /analysis
    AnalysisStepper.tsx
    LoadingSkeleton.tsx
  /dashboard
    ScoreSummary.tsx
    ScoreBar.tsx
    ResultStats.tsx
  /statements
    StatementCard.tsx
    VerdictBadge.tsx
    EvidencePanel.tsx
    SourceList.tsx
  /common
    Button.tsx
    Card.tsx
    Badge.tsx
```

### 페이지 구조

```text
/app
  page.tsx
  /results
    page.tsx
  /api
    /transcribe/route.ts
    /analyze/route.ts
    /factcheck/route.ts
```

---

## 6. 샘플 데이터 구조

```ts
export type StatementResult = {
  id: string;
  timestamp: string;
  speaker: string;
  line: string;
  consistency: {
    status: "CONSISTENT" | "CONTRADICTION" | "INSUFFICIENT_CONTEXT";
    label: string;
    reason: string;
    confidence: number;
    pastStatement?: {
      text: string;
      date: string;
      sourceTitle: string;
      sourceUrl: string;
    };
  };
  factuality: {
    isFactualClaim: boolean;
    verdict: "TRUE" | "FALSE" | "UNVERIFIABLE" | "NOT_FACTUAL";
    label: string;
    reason: string;
    sourceType?: "INSEE" | "KOSIS" | "WEB";
    confidence: number;
    sources: {
      title: string;
      url: string;
    }[];
  };
};
```

---

## 7. Tailwind 디자인 토큰

`tailwind.config.ts`에 다음 색상 개념을 반영한다.

```ts
const config = {
  theme: {
    extend: {
      colors: {
        background: "#F7F8FA",
        surface: "#FFFFFF",
        muted: "#F1F4F8",
        navy: "#172033",
        line: "#E5E7EB",
        consistency: "#2563EB",
        factuality: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 8px 30px rgba(15, 23, 42, 0.06)",
      },
    },
  },
};
export default config;
```

---

## 8. 주요 문구 가이드

### 좋은 문구

- `모순 의심`
- `사실과 다름`
- `검증불가`
- `출처 기반 판정`
- `AI 1차 분석`
- `사람 최종 검증 필요`
- `의견/가치판단은 검증 대상에서 제외`

### 피해야 할 문구

- `거짓말`
- `위선자`
- `가짜뉴스 확정`
- `정치인 박제`
- `참교육`
- `AI가 밝혀낸 진실`

---

## 9. 데모용 화면 구성 우선순위

2일 해커톤에서는 모든 화면을 완벽히 만들기보다 다음 순서로 구현한다.

### 1순위

- 랜딩 + 업로드/대본 입력
- 결과 대시보드
- 발언 카드
- 배지 2개
- 상세 근거 accordion

### 2순위

- 분석 진행 stepper
- 출처 리스트
- 샘플 데이터 실행 버튼
- 반응형 레이아웃

### 3순위

- 영상 플레이어와 타임스탬프 연동
- 필터/정렬
- export 기능
- 다크모드

---

## 10. 빠른 구현 체크리스트

- [ ] Hero에 두 축 검증 구조가 보이는가?
- [ ] 영상 업로드 실패 시 대본 폴백이 보이는가?
- [ ] 일관성 점수와 정확성 점수가 분리되어 있는가?
- [ ] 발언 카드마다 배지가 2개 있는가?
- [ ] 출처 링크가 숨겨지지 않고 보이는가?
- [ ] 검증불가 상태가 자연스럽게 표현되는가?
- [ ] AI가 단정하지 않는 문구를 쓰는가?
- [ ] 최종 검증은 사람이라는 안내가 있는가?
- [ ] 2일 안에 구현 가능한 범위인가?
```
