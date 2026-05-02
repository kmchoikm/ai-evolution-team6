# SPEC — STEP 2: 사용자 프로필 입력 폼
## 발 상태 + 러닝 습관 진단 UI

담당: 프론트엔드 담당자
버전: 2.0 | 날짜: 2025.06

---

## 개요

이 단계의 목표: 사용자가 **클릭만으로 30초~1분** 안에 자신의 발 상태와 러닝 습관을 입력하고, 이를 추천 엔진이 이해할 수 있는 **JSON 프로필**로 변환하는 것.

```
사용자 접속 (index.html)
    │
    ▼
7개 질문에 클릭으로 답변
    │
    ▼
입력값 수집 → JSON 프로필 생성
    │
    ▼
POST /api/recommend 요청
(또는 로컬 매칭 함수 호출)
```

---

## 1. 질문 설계

### Q1. 주로 달리는 거리 (필수)

```
주로 얼마나 달리시나요?

  ○  🚶 가볍게 조깅    (5km 이하)
  ○  🏃 일반 훈련      (5~10km)
  ○  🏃‍♂️ 장거리 훈련  (10~21km)
  ○  🏅 마라톤 대회    (21km 이상)
```

| 선택지 | JSON 값 |
|--------|---------|
| 가볍게 조깅 (5km 이하) | `"short"` |
| 일반 훈련 (5~10km) | `"medium"` |
| 장거리 훈련 (10~21km) | `"long"` |
| 마라톤 대회 (21km 이상) | `"marathon"` |

---

### Q2. 러닝 빈도

```
얼마나 자주 달리시나요?

  ○  주 1~2회  (취미 러너)
  ○  주 3~4회  (꾸준한 훈련)
  ○  주 5회 이상  (매일 수준)
```

| 선택지 | JSON 값 |
|--------|---------|
| 주 1~2회 | `"casual"` |
| 주 3~4회 | `"regular"` |
| 주 5회 이상 | `"intensive"` |

---

### Q3. 발볼 유형 (필수)

```
평소 신발을 신을 때 발볼(엄지~새끼발가락 너비) 불편함이 있나요?

  ○  😣 발볼이 넓어서 신발이 항상 조임
  ○  😊 보통  (대부분의 신발이 잘 맞음)
  ○  😕 발볼이 좁아서 신발이 넓게 느껴짐
```

| 선택지 | JSON 값 |
|--------|---------|
| 발볼이 넓어서 신발이 조임 | `"wide"` |
| 보통 | `"normal"` |
| 발볼이 좁아서 신발이 넓게 느껴짐 | `"narrow"` |

---

### Q4. 원하는 쿠션감

```
어떤 쿠션감을 선호하시나요?

  딱딱함  ●──○──○──○──○  물렁함
           1   2   3   4   5
         반발력 중간 포근함  구름 위
```

| 값 | 의미 |
|----|------|
| 1 | 매우 딱딱 — 반발력 최대, 경량 |
| 2 | 약간 딱딱 — 빠른 훈련용 |
| 3 | 중간 — 범용적 |
| 4 | 약간 물렁 — 장거리 편안함 |
| 5 | 매우 물렁 — 쿠션 최대, 부상 방지 |

기본값: `3`

---

### Q5. 중요하게 생각하는 요소 (최대 3개 복수 선택)

```
러닝화에서 무엇이 가장 중요한가요? (최대 3개)

  □  ⚡ 가볍고 빠른 속도감
  □  🛡️ 무릎/발 보호 (부상 방지)
  □  💆 오래 신어도 편함 (피로감 최소)
  □  🌬️ 통기성 (여름 착화감)
  □  ✨ 디자인 / 색상
```

| 선택지 | JSON 값 |
|--------|---------|
| 가볍고 빠른 속도감 | `"speed"` |
| 무릎/발 보호 | `"protection"` |
| 오래 신어도 편함 | `"comfort"` |
| 통기성 | `"breathability"` |
| 디자인 / 색상 | `"design"` |

4개 이상 선택 시: "3개까지만 선택해 주세요" 경고 표시

---

### Q6. 예산 범위 (선택)

```
예산 범위를 알려주시면 더 정확한 추천이 가능해요.

  ○  ~7만원
  ○  7~12만원
  ○  12~20만원
  ○  20만원 이상
  ○  상관없음
```

| 선택지 | JSON 값 | 가격 상한 |
|--------|---------|---------|
| ~7만원 | `"low"` | 70,000원 |
| 7~12만원 | `"mid"` | 120,000원 |
| 12~20만원 | `"high"` | 200,000원 |
| 20만원 이상 | `"premium"` | 무제한 |
| 상관없음 | `null` | 무제한 |

---

### Q7. 하고 싶은 말 (선택, 자유 입력)

```
추가로 알려주실 내용이 있나요? (선택)

  [______________________________________]

  예) "평발이에요" / "아킬레스건이 약해요" / "가을 마라톤 준비 중"
      "발등이 높아서 항상 끈을 느슨하게 묶어요"
```

- 최대 200자
- 입력하지 않아도 됨
- LLM 추천 엔진에 그대로 전달되어 세밀한 추천에 활용

---

## 2. 사용자 프로필 JSON 스키마

```json
{
  "running_distance": "medium",
  "frequency": "regular",
  "foot_width": "wide",
  "preferred_cushion": 4,
  "priorities": ["protection", "comfort"],
  "budget": "mid",
  "free_text": "평발이라 발바닥이 자주 아파요"
}
```

### 필드 상세

| 필드명 | 타입 | 필수 | 기본값 | 가능한 값 |
|--------|------|------|--------|---------|
| running_distance | string | ✅ | — | "short" / "medium" / "long" / "marathon" |
| frequency | string | — | "casual" | "casual" / "regular" / "intensive" |
| foot_width | string | ✅ | — | "wide" / "normal" / "narrow" |
| preferred_cushion | int | — | 3 | 1 ~ 5 |
| priorities | array | — | [] | ["speed", "protection", "comfort", "breathability", "design"] |
| budget | string | — | null | "low" / "mid" / "high" / "premium" / null |
| free_text | string | — | "" | 자유 텍스트, 최대 200자 |

---

## 3. 입력값 검증 규칙

```javascript
function validateForm(profile) {
    const errors = [];

    // 필수 항목
    if (!profile.running_distance) {
        errors.push("Q1 '달리는 거리'를 선택해 주세요.");
    }
    if (!profile.foot_width) {
        errors.push("Q3 '발볼 유형'을 선택해 주세요.");
    }

    // 복수 선택 최대 3개
    if (profile.priorities.length > 3) {
        errors.push("Q5 '중요 요소'는 최대 3개까지 선택 가능합니다.");
    }

    // 자유 입력 길이
    if (profile.free_text && profile.free_text.length > 200) {
        errors.push("Q7 추가 내용은 200자 이내로 입력해 주세요.");
    }

    return errors;
}
```

---

## 4. UI 레이아웃 (index.html)

```
┌─────────────────────────────────────────┐
│  🏃 RunFit                        로고  │
├─────────────────────────────────────────┤
│                                         │
│   "내 발에 딱 맞는 러닝화를              │
│    찾아드립니다"                         │
│                                         │
│   ━━━━━━━━ 3분 진단 시작 ━━━━━━━━       │
│                                         │
│   Q1. 주로 달리는 거리는?               │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ │
│   │🚶 조깅│ │🏃 훈련│ │장거리│ │마라톤│ │
│   └──────┘ └──────┘ └──────┘ └──────┘ │
│                                         │
│   Q2. 러닝 빈도는?                      │
│   ┌────────┐ ┌────────┐ ┌────────┐    │
│   │주 1~2회│ │주 3~4회│ │주 5회+ │    │
│   └────────┘ └────────┘ └────────┘    │
│                                         │
│   Q3. 발볼이 넓은 편인가요?             │
│   ┌──────┐ ┌──────┐ ┌──────┐          │
│   │😣 넓음│ │😊 보통│ │😕 좁음│         │
│   └──────┘ └──────┘ └──────┘          │
│                                         │
│   Q4. 원하는 쿠션감                     │
│   딱딱 ●──○──○──○──○ 물렁             │
│          1  2  3  4  5                  │
│                                         │
│   Q5. 중요 요소 (최대 3개)              │
│   □ 속도감  □ 부상방지  □ 편안함        │
│   □ 통기성  □ 디자인                   │
│                                         │
│   Q6. 예산 (선택)                       │
│   ○ ~7만  ○ 7~12만  ○ 12~20만  ○ 20만+ │
│                                         │
│   Q7. 추가로 알려주실 내용 (선택)        │
│   ┌────────────────────────────────┐   │
│   │ 예) 평발이에요, 아킬레스건 약해요 │   │
│   └────────────────────────────────┘   │
│                                         │
│          ┌───────────────────┐          │
│          │   추천 받기  →    │          │
│          └───────────────────┘          │
└─────────────────────────────────────────┘
```

---

## 5. JavaScript 구현

### 폼 데이터 수집

```javascript
function collectFormData() {
    return {
        running_distance: document.querySelector('input[name="distance"]:checked')?.value || null,
        frequency:        document.querySelector('input[name="frequency"]:checked')?.value || "casual",
        foot_width:       document.querySelector('input[name="width"]:checked')?.value || null,
        preferred_cushion: parseInt(document.getElementById('cushion-slider').value) || 3,
        priorities: Array.from(
            document.querySelectorAll('input[name="priorities"]:checked')
        ).map(el => el.value),
        budget:     document.querySelector('input[name="budget"]:checked')?.value || null,
        free_text:  document.getElementById('free-text').value.trim(),
    };
}
```

### 폼 제출 흐름

```javascript
document.getElementById('submit-btn').addEventListener('click', async () => {
    const profile = collectFormData();
    const errors = validateForm(profile);

    if (errors.length > 0) {
        showErrors(errors);
        return;
    }

    showLoading("AI가 최적의 러닝화를 찾고 있어요... 🔍");

    try {
        const response = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_profile: profile })
        });
        const data = await response.json();
        sessionStorage.setItem('recommendations', JSON.stringify(data));
        sessionStorage.setItem('user_profile', JSON.stringify(profile));
        window.location.href = 'result.html';

    } catch (err) {
        // 서버 없는 환경 (GitHub Pages 정적 배포)에서는 로컬 매칭
        const data = await getLocalRecommendations(profile);
        sessionStorage.setItem('recommendations', JSON.stringify(data));
        window.location.href = 'result.html';
    }
});
```

### 로딩 화면

```javascript
function showLoading(message) {
    document.getElementById('loading-overlay').style.display = 'flex';
    document.getElementById('loading-message').textContent = message;
}
```

---

## 6. UX 고려사항

| 항목 | 지침 |
|------|------|
| 전체 완료 시간 | 목표 30초~1분 (모든 질문 클릭 방식) |
| 모바일 | 버튼 최소 44px 높이 (엄지손가락 터치 영역) |
| 진행 표시 | 상단 프로그레스 바 (Q1~Q7 단계) |
| 선택 피드백 | 선택된 버튼 색상 변경 (active state) |
| 필수 항목 표시 | Q1, Q3 우측에 빨간 * 표시 |
| 오류 처리 | 제출 시 미선택 항목 스크롤 이동 + 강조 |
