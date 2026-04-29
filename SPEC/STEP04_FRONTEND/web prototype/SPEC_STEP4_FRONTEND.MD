# SPEC — STEP 4: 웹 프론트엔드
## 추천 결과 UI + GitHub Pages 배포

담당: 프론트엔드 / 디자인 담당자
버전: 2.0 | 날짜: 2025.06

---

## 개요

이 단계의 목표: 사용자가 실제로 접속하여 추천 결과를 보는 **완성된 웹페이지**를 만들고, **GitHub Pages**로 공개 배포하는 것.

```
index.html  →  result.html
(입력 폼)      (추천 결과)

배포: https://{username}.github.io/{repo}/
```

---

## 1. 파일 구조

```
frontend/
├── index.html          ← 입력 폼 (STEP 2 UI)
├── result.html         ← 추천 결과 (STEP 3 출력)
├── style.css           ← 공통 스타일
├── app.js              ← 공통 JS (폼 수집, 로딩, 라우팅)
├── recommend.js        ← 추천 로직 (LLM API 호출 + 로컬 폴백)
└── data/
    └── product_profiles.json  ← LLM 추출 완료된 신발 속성 DB
```

---

## 2. index.html — 입력 폼 페이지

### 2.1 전체 레이아웃

```
┌──────────────────────────────────────────┐
│  🏃 RunFit                         logo  │
├──────────────────────────────────────────┤
│                                          │
│   내 발에 딱 맞는 러닝화를               │
│   찾아드립니다                           │
│                                          │
│   ━━━━━━━━━ 3분 진단 ━━━━━━━━━━         │
│   ●──────────────────────○  진행도       │
│                                          │
│   [질문 영역 — 스크롤]                   │
│                                          │
│          [ 추천 받기 → ]                 │
└──────────────────────────────────────────┘
```

### 2.2 HTML 구조 (핵심 부분)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RunFit — 내 발에 맞는 러닝화 찾기</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-50 min-h-screen">

  <!-- 헤더 -->
  <header class="bg-white shadow-sm py-4 px-6 flex items-center gap-2">
    <span class="text-2xl">🏃</span>
    <h1 class="text-xl font-bold text-gray-900">RunFit</h1>
  </header>

  <!-- 히어로 -->
  <section class="text-center py-10 px-6">
    <h2 class="text-2xl font-bold text-gray-900 mb-2">
      내 발에 딱 맞는 러닝화를 찾아드립니다
    </h2>
    <p class="text-gray-500">실제 구매자 리뷰를 AI로 분석한 맞춤 추천</p>
  </section>

  <!-- 폼 -->
  <main class="max-w-xl mx-auto px-4 pb-20 space-y-10">

    <!-- Q1 -->
    <div class="question-block">
      <h3 class="question-title">Q1. 주로 달리는 거리는? <span class="required">*</span></h3>
      <div class="option-grid">
        <label class="option-btn">
          <input type="radio" name="distance" value="short" hidden>
          <span>🚶 5km 이하<br><small>가볍게 조깅</small></span>
        </label>
        <label class="option-btn">
          <input type="radio" name="distance" value="medium" hidden>
          <span>🏃 5~10km<br><small>일반 훈련</small></span>
        </label>
        <label class="option-btn">
          <input type="radio" name="distance" value="long" hidden>
          <span>🏃‍♂️ 10~21km<br><small>장거리 훈련</small></span>
        </label>
        <label class="option-btn">
          <input type="radio" name="distance" value="marathon" hidden>
          <span>🏅 21km+<br><small>마라톤</small></span>
        </label>
      </div>
    </div>

    <!-- Q3 (발볼) -->
    <div class="question-block">
      <h3 class="question-title">Q3. 발볼이 넓은 편인가요? <span class="required">*</span></h3>
      <div class="option-grid-3">
        <label class="option-btn">
          <input type="radio" name="width" value="wide" hidden>
          <span>😣 넓음<br><small>신발이 조임</small></span>
        </label>
        <label class="option-btn">
          <input type="radio" name="width" value="normal" hidden>
          <span>😊 보통<br><small>대부분 맞음</small></span>
        </label>
        <label class="option-btn">
          <input type="radio" name="width" value="narrow" hidden>
          <span>😕 좁음<br><small>신발이 넓음</small></span>
        </label>
      </div>
    </div>

    <!-- Q4 쿠션 슬라이더 -->
    <div class="question-block">
      <h3 class="question-title">Q4. 원하는 쿠션감</h3>
      <div class="slider-labels">
        <span>딱딱함<br><small>반발력</small></span>
        <span>물렁함<br><small>구름 위</small></span>
      </div>
      <input type="range" id="cushion-slider" min="1" max="5" value="3" class="w-full">
      <p class="text-center text-sm text-gray-500 mt-1" id="cushion-label">중간 쿠션 (3/5)</p>
    </div>

    <!-- Q5 중요 요소 -->
    <div class="question-block">
      <h3 class="question-title">Q5. 중요하게 생각하는 요소 <small>(최대 3개)</small></h3>
      <div class="checkbox-grid">
        <label class="check-btn"><input type="checkbox" name="priorities" value="speed"> ⚡ 속도감/경량</label>
        <label class="check-btn"><input type="checkbox" name="priorities" value="protection"> 🛡️ 부상 방지</label>
        <label class="check-btn"><input type="checkbox" name="priorities" value="comfort"> 💆 편안함</label>
        <label class="check-btn"><input type="checkbox" name="priorities" value="breathability"> 🌬️ 통기성</label>
        <label class="check-btn"><input type="checkbox" name="priorities" value="design"> ✨ 디자인</label>
      </div>
    </div>

    <!-- Q7 자유 입력 -->
    <div class="question-block">
      <h3 class="question-title">Q7. 추가로 알려주실 내용 <small>(선택)</small></h3>
      <textarea id="free-text" rows="3" maxlength="200"
        placeholder="예) 평발이에요 / 아킬레스건이 약해요 / 가을 마라톤 준비 중"
        class="w-full border rounded-lg p-3 text-sm resize-none"></textarea>
    </div>

    <!-- 제출 버튼 -->
    <button id="submit-btn"
      class="w-full bg-black text-white py-4 rounded-xl text-lg font-semibold hover:bg-gray-800 transition">
      추천 받기 →
    </button>

    <!-- 오류 메시지 영역 -->
    <div id="error-area" class="hidden text-red-500 text-sm space-y-1"></div>
  </main>

  <!-- 로딩 오버레이 -->
  <div id="loading-overlay" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-8 text-center">
      <div class="animate-spin text-4xl mb-4">🔍</div>
      <p class="text-lg font-medium" id="loading-message">AI가 최적의 러닝화를 찾고 있어요...</p>
    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

---

## 3. result.html — 추천 결과 페이지

### 3.1 전체 레이아웃

```
┌──────────────────────────────────────────┐
│  🏃 RunFit                               │
├──────────────────────────────────────────┤
│                                          │
│  고객님께 딱 맞는 러닝화 TOP 3           │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  #1  ★★★★★  88% 매칭            │  │
│  │  [신발 이미지]                     │  │
│  │  뉴발란스 W480SK5 (4E)            │  │
│  │  ₩99,000                          │  │
│  │                                    │  │
│  │  [4E 와이드핏] [높은 쿠션] [장거리]│  │
│  │                                    │  │
│  │  "발볼이 넓으신 분께 4E 와이드 핏  │  │
│  │   으로 설계되어 전족부 압박이 없   │  │
│  │   습니다. 쿠션감 4/5로 장거리..."  │  │
│  │                                    │  │
│  │  [무신사에서 보기 →]              │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ──── 다른 추천 ────                    │
│  [#2 카드]          [#3 카드]           │
│                                          │
│  ─────────────────────────────────────   │
│  💬 AI 종합 조언                        │
│  "발볼이 넓고 평발이신 분께는 쿠션과    │
│   아치 지지가 핵심입니다..."            │
│                                          │
│  [ ← 다시 진단하기 ]                    │
└──────────────────────────────────────────┘
```

### 3.2 추천 카드 컴포넌트

```javascript
// recommend.js

function renderRecommendationCard(rec, isTop = false) {
    const stars = '★'.repeat(Math.round(rec.match_score / 20));
    const priceFormatted = Number(rec.price).toLocaleString();

    return `
    <div class="rec-card ${isTop ? 'rec-card--top' : ''}">
      <div class="rec-header">
        <span class="rank-badge">#${rec.rank}</span>
        <span class="match-score">${stars} ${rec.match_score}% 매칭</span>
      </div>

      <img src="${rec.thumbnail}" alt="${rec.goods_name}"
           onerror="this.src='data:image/svg+xml,...'"
           class="rec-image">

      <div class="rec-body">
        <p class="rec-brand">${rec.brand}</p>
        <h3 class="rec-name">${rec.goods_name}</h3>
        <p class="rec-price">₩${priceFormatted}</p>

        <div class="feature-tags">
          ${rec.highlight_features.map(f =>
            `<span class="tag">${f}</span>`
          ).join('')}
        </div>

        <p class="rec-reason">${rec.reason}</p>

        ${rec.caution ? `
          <p class="caution">⚠️ ${rec.caution}</p>
        ` : ''}

        <a href="${rec.url}" target="_blank" rel="noopener" class="btn-musinsa">
          무신사에서 보기 →
        </a>
      </div>
    </div>`;
}

function renderResults(data) {
    const { recommendations, overall_advice } = data;

    // TOP 1 (크게)
    document.getElementById('rec-top').innerHTML =
        renderRecommendationCard(recommendations[0], true);

    // TOP 2, 3 (가로 배치)
    document.getElementById('rec-others').innerHTML =
        recommendations.slice(1).map(r => renderRecommendationCard(r)).join('');

    // 종합 조언
    document.getElementById('overall-advice').textContent = overall_advice;
}
```

### 3.3 HTML 구조 (result.html)

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RunFit — 추천 결과</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-gray-50 min-h-screen">

  <header class="bg-white shadow-sm py-4 px-6 flex items-center gap-2">
    <span class="text-2xl">🏃</span>
    <h1 class="text-xl font-bold">RunFit</h1>
  </header>

  <main class="max-w-2xl mx-auto px-4 py-8">
    <h2 class="text-2xl font-bold text-center mb-8">
      고객님께 딱 맞는 러닝화 TOP 3
    </h2>

    <!-- TOP 1 추천 (크게) -->
    <div id="rec-top" class="mb-6"></div>

    <!-- TOP 2, 3 추천 -->
    <h3 class="text-lg font-semibold text-gray-600 mb-4">다른 추천</h3>
    <div id="rec-others" class="grid grid-cols-2 gap-4 mb-8"></div>

    <!-- AI 종합 조언 -->
    <div class="bg-blue-50 rounded-2xl p-6 mb-8">
      <h3 class="font-bold text-blue-800 mb-2">💬 AI 종합 조언</h3>
      <p id="overall-advice" class="text-blue-700 text-sm leading-relaxed"></p>
    </div>

    <!-- 다시 진단 -->
    <a href="index.html" class="block text-center text-gray-500 underline">
      ← 다시 진단하기
    </a>
  </main>

  <script src="recommend.js"></script>
  <script>
    const data = JSON.parse(sessionStorage.getItem('recommendations') || '{}');
    if (data.recommendations) {
        renderResults(data);
    } else {
        window.location.href = 'index.html';
    }
  </script>
</body>
</html>
```

---

## 4. CSS 핵심 스타일 (style.css)

```css
/* 선택 버튼 */
.option-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 16px 12px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s;
    text-align: center;
}
.option-btn:has(input:checked) {
    border-color: #111827;
    background: #f9fafb;
    font-weight: 600;
}
.option-grid   { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.option-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

/* 추천 카드 */
.rec-card {
    background: white;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}
.rec-card--top {
    box-shadow: 0 4px 20px rgba(0,0,0,0.12);
    border: 2px solid #111827;
}
.rec-image { width: 100%; height: 200px; object-fit: cover; }
.rec-body  { padding: 16px; }
.rec-brand { font-size: 12px; color: #6b7280; margin-bottom: 2px; }
.rec-name  { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
.rec-price { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 12px; }

/* 태그 */
.feature-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.tag {
    background: #f3f4f6;
    color: #374151;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
}

/* 추천 이유 */
.rec-reason { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 8px; }
.caution    { font-size: 12px; color: #d97706; margin-bottom: 8px; }

/* 매칭 뱃지 */
.match-score { color: #f59e0b; font-weight: 600; font-size: 14px; }

/* 무신사 링크 버튼 */
.btn-musinsa {
    display: block;
    text-align: center;
    background: #111827;
    color: white;
    padding: 12px;
    border-radius: 10px;
    font-weight: 600;
    text-decoration: none;
    margin-top: 12px;
    transition: background 0.15s;
}
.btn-musinsa:hover { background: #374151; }

/* 필수 표시 */
.required { color: #ef4444; }

/* 로딩 스피너 */
@keyframes spin { to { transform: rotate(360deg); } }
.animate-spin  { animation: spin 1s linear infinite; display: inline-block; }
```

---

## 5. GitHub Pages 배포

### 5.1 배포 단계

```bash
# 1. GitHub 리포지토리 생성
#    예) https://github.com/your-team/runfit

# 2. 파일 업로드
git init
git add frontend/
git commit -m "Initial frontend"
git remote add origin https://github.com/your-team/runfit.git
git push -u origin main

# 3. GitHub Pages 활성화
#    Settings → Pages → Source: main 브랜치 / root 폴더
#    → https://your-team.github.io/runfit/
```

### 5.2 배포 방식 선택

| 시나리오 | 구성 | 비용 |
|---------|------|------|
| **정적 MVP** | GitHub Pages 단독, 로컬 JS 매칭 | 무료 |
| **LLM 추천** | GitHub Pages + Render 백엔드 | 무료 (Render 무료 플랜) |
| **풀 스택** | Vercel (프론트) + Render (백엔드) | 무료 |

### 5.3 백엔드 없는 정적 배포 흐름

```javascript
// app.js — 서버 있으면 API 호출, 없으면 로컬 매칭
async function submitAndRedirect(profile) {
    showLoading("AI가 최적의 러닝화를 찾고 있어요...");
    let data;
    try {
        // LLM 백엔드 시도
        const res = await fetch('https://runfit-api.onrender.com/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_profile: profile }),
            signal: AbortSignal.timeout(10000)  // 10초 타임아웃
        });
        data = await res.json();
    } catch {
        // 폴백: 로컬 규칙 기반 매칭
        data = await getLocalRecommendations(profile);
    }
    sessionStorage.setItem('recommendations', JSON.stringify(data));
    window.location.href = 'result.html';
}
```

---

## 6. 반응형 디자인

| 브레이크포인트 | 레이아웃 |
|------------|---------|
| 모바일 (< 640px) | 1열, 버튼 높이 48px+ |
| 태블릿 (640~1024px) | 2열 그리드 |
| 데스크탑 (> 1024px) | 최대 너비 640px 고정, 중앙 정렬 |

```css
@media (max-width: 640px) {
    .option-grid   { grid-template-columns: repeat(2, 1fr); }
    .option-grid-3 { grid-template-columns: repeat(3, 1fr); }
    .rec-image     { height: 160px; }
    #rec-others    { grid-template-columns: 1fr; }
}
```

---

## 7. 빈 상태 UI (추가 범위)

매칭 신발 0개일 때 빈 화면 대신 안내 메시지 표시:

```javascript
function renderResults(data) {
    const { recommendations } = data;

    // 매칭 결과 없음 처리
    if (!recommendations || recommendations.length === 0) {
        document.getElementById('rec-top').innerHTML = `
        <div class="empty-state">
            <p class="text-4xl mb-4">🤔</p>
            <h3 class="font-bold text-xl mb-2">딱 맞는 신발을 못 찾았어요</h3>
            <p class="text-gray-500 mb-6">
                현재 조건에 맞는 신발이 없습니다.<br>
                예산 조건이나 발볼 기준을 완화해 보세요.
            </p>
            <a href="index.html" class="btn-musinsa inline-block">
                ← 조건 다시 설정하기
            </a>
        </div>`;
        return;
    }
    // ... 정상 렌더링
}
```

## 8. 신발 비교 모달 (추가 범위)

result.html에 TOP2 vs TOP3 속성 비교 표:

```javascript
function renderCompareTable(rec1, rec2) {
    const attrs = [
        { key: 'width',         label: '발볼' },
        { key: 'cushion',       label: '쿠션감',  unit: '/5' },
        { key: 'weight',        label: '무게감',  unit: '/5' },
        { key: 'breathability', label: '통기성',  unit: '/5' },
        { key: 'fit',           label: '착용감',  unit: '/5' },
    ];

    const rows = attrs.map(a => `
    <tr>
        <td class="attr-label">${a.label}</td>
        <td class="${highlight(rec1.attributes[a.key], rec2.attributes[a.key])}">
            ${rec1.attributes[a.key] ?? '—'}${a.unit || ''}
        </td>
        <td class="${highlight(rec2.attributes[a.key], rec1.attributes[a.key])}">
            ${rec2.attributes[a.key] ?? '—'}${a.unit || ''}
        </td>
    </tr>`).join('');

    return `
    <div class="compare-table mt-6">
        <h4 class="font-semibold mb-3">🔍 #1 vs #2 속성 비교</h4>
        <table class="w-full text-sm">
            <thead>
                <tr>
                    <th>속성</th>
                    <th>#1 ${rec1.brand}</th>
                    <th>#2 ${rec2.brand}</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

function highlight(val1, val2) {
    // 숫자형: 더 높은 쪽 강조 (발볼은 제외)
    if (typeof val1 === 'number' && val1 > val2) return 'text-green-600 font-bold';
    return '';
}
```

## 9. 개발 체크리스트

### 필수 버그 수정 (CEO 검토 결과)
- [ ] `calculateMatchScore`: narrow foot + 넓음 신발에도 -20 페널티 추가
- [ ] submit 버튼 더블클릭 방지 (클릭 후 `disabled = true`)
- [ ] `fetch('./data/product_profiles.json')` 실패 시 오류 메시지 표시
- [ ] `.gitignore`: `.env`, `crawler/data/*.csv`, `*.json.bak` 추가

### index.html
- [ ] Q1~Q7 질문 구현
- [ ] 선택 시 버튼 active 상태 CSS
- [ ] 쿠션 슬라이더 레이블 동적 업데이트
- [ ] 필수 항목 미입력 시 오류 표시
- [ ] 로딩 오버레이 애니메이션
- [ ] 모바일 반응형 확인

### result.html
- [ ] TOP 1 카드 (크게)
- [ ] TOP 2, 3 카드 (작게, 2열)
- [ ] **빈 상태 UI** (매칭 0개 시 안내 + 다시 진단하기) ← 신규
- [ ] **비교 모달** (#1 vs #2 속성 표) ← 신규
- [ ] 추천 이유 텍스트 표시
- [ ] 하이라이트 태그 렌더링
- [ ] ⚠️ 주의사항 표시 (있을 때만)
- [ ] 무신사 링크 버튼 (새 탭)
- [ ] AI 종합 조언 박스
- [ ] 다시 진단하기 버튼
- [ ] 이미지 로드 실패 시 플레이스홀더

### 배포
- [ ] GitHub 리포지토리 생성
- [ ] .gitignore 설정 확인 (API 키, CSV 제외)
- [ ] product_profiles.json만 포함 확인
- [ ] GitHub Pages 활성화
- [ ] 모바일에서 실제 접속 테스트
- [ ] 무신사 제품 링크 클릭 → 올바른 페이지 이동 확인
