# SPEC — STEP 3: AI 추천 엔진
## 사용자 프로필 × 신발 속성 DB → LLM 매칭 + 추천 이유 생성

담당: 백엔드 / AI 담당자
버전: 2.0 | 날짜: 2025.06

---

## 개요

이 단계의 목표: STEP 2에서 받은 **사용자 프로필 JSON**과 STEP 1에서 만든 **신발 속성 DB**를 LLM에 전달하여, 상위 3개 제품 추천과 **한국어 추천 이유**를 생성하는 것.

```
user_profile (JSON)     product_profiles.json
       │                         │
       └──────────┬──────────────┘
                  ▼
        Claude API (claude-sonnet)
                  │
                  ▼
        추천 결과 3건 + 이유 + 종합 조언
```

---

## 1. 추천 방식 2가지

### 방식 A: LLM 실시간 추천 (권장 — 발표용)

Claude API(claude-sonnet-4-6)에 사용자 프로필 + 신발 DB 전달 → 매칭 + 이유 생성

- **장점**: 자유 텍스트(Q7) 반영, 자연스러운 한국어 추천 이유, free_text 맥락 활용
- **단점**: API 비용 (~$0.01/회), 응답 시간 ~3초
- **필요**: FastAPI 백엔드 서버

### 방식 B: 로컬 규칙 기반 매칭 (폴백 — 정적 배포용)

JavaScript로 속성 점수 비교 → 매칭 점수 계산

- **장점**: 서버 없음, 무료, GitHub Pages 단독 배포 가능
- **단점**: free_text 미반영, 추천 이유 고정 템플릿
- **필요**: `product_profiles.json`만 있으면 됨

---

## 2. 방식 A: LLM 추천 엔진

### 2.1 추천 프롬프트

```python
RECOMMENDATION_PROMPT = """
당신은 러닝화 전문 피팅 컨설턴트입니다.
아래 고객 프로필과 신발 데이터를 바탕으로 최적의 러닝화 TOP 3를 추천해 주세요.

[고객 프로필]
- 주 달리기 거리: {running_distance_label}
- 러닝 빈도: {frequency_label}
- 발볼 유형: {foot_width_label}
- 선호 쿠션감: {preferred_cushion}/5 (1=매우딱딱, 5=매우물렁)
- 중요 요소: {priorities_label}
- 예산: {budget_label}
- 추가 정보: {free_text}

[러닝화 데이터베이스]
{shoes_database}

[추천 규칙]
1. 발볼이 가장 중요한 필터 — 발볼 넓은 고객에게 좁은 신발(width=좁음) 절대 추천 금지
2. 거리에 맞는 쿠션: 장거리/마라톤 → 높은 쿠션(4~5) 우선
3. 예산 범위 벗어나는 제품은 추천에서 제외
4. 추천 이유는 반드시 실제 리뷰 내용과 속성 수치를 근거로 설명
5. 추가 정보(free_text)가 있으면 최우선 반영 (평발, 부상 이력 등)

[출력 형식 - JSON만 출력, 다른 텍스트 없이]
{{
  "recommendations": [
    {{
      "goods_no": "제품ID 문자열",
      "rank": 1,
      "match_score": 88,
      "reason": "발볼이 넓으신 분께 이 신발은 전족부 공간이 넉넉하게 설계되어 있으며, 쿠션감 4/5로 장거리 훈련 시 무릎 보호에 적합합니다. 리뷰에서도 '발볼 있어도 편하다'는 언급이 다수 확인됩니다.",
      "highlight_features": ["넓은 발볼", "높은 쿠션", "장거리 적합"],
      "caution": "통기성 2/5로 낮음 — 여름 장거리 착화 시 주의"
    }},
    {{...}},
    {{...}}
  ],
  "overall_advice": "발볼이 넓고 장거리 훈련을 주목적으로 하시는 분께는 쿠션과 발볼 여유가 핵심입니다. 1순위 추천 신발로 시작하시고, 발이 익숙해지면 경량 모델도 고려해 보세요."
}}
"""
```

### 2.2 프롬프트 변수 매핑

```python
DISTANCE_LABELS = {
    "short":    "5km 이하 조깅",
    "medium":   "5~10km 일반 훈련",
    "long":     "10~21km 장거리 훈련",
    "marathon": "21km 이상 마라톤",
}
FREQUENCY_LABELS = {
    "casual":    "주 1~2회",
    "regular":   "주 3~4회",
    "intensive": "주 5회 이상",
}
WIDTH_LABELS = {
    "wide":   "넓은 발볼 (신발이 조임)",
    "normal": "보통 발볼",
    "narrow": "좁은 발볼 (신발이 넓게 느껴짐)",
}
PRIORITY_LABELS = {
    "speed":          "빠른 속도감/경량",
    "protection":     "무릎·발 보호",
    "comfort":        "장시간 착화 편안함",
    "breathability":  "통기성",
    "design":         "디자인/색상",
}
BUDGET_LABELS = {
    "low":     "7만원 이하",
    "mid":     "7~12만원",
    "high":    "12~20만원",
    "premium": "20만원 이상",
    None:      "제한 없음",
}
```

### 2.3 신발 DB 직렬화

```python
def format_shoes_for_prompt(profiles: list[dict], user_budget: str) -> str:
    """신발 프로필 → 프롬프트용 텍스트 변환 (예산 필터 포함)"""
    budget_max = {"low": 70000, "mid": 120000, "high": 200000, "premium": float('inf'), None: float('inf')}
    max_price = budget_max.get(user_budget, float('inf'))

    lines = []
    for p in profiles:
        # 속성 데이터 없는 제품 제외
        if not any([p.get('width'), p.get('cushion'), p.get('fit')]):
            continue
        # 예산 초과 제품 제외
        if int(p.get('price', 0)) > max_price:
            continue

        line = (
            f"[{p['goods_no']}] {p['brand']} {p['goods_name'][:30]}\n"
            f"  가격: {int(p['price']):,}원 | 성별: {p.get('gender','?')}\n"
            f"  발볼: {p.get('width','?')} | 쿠션: {p.get('cushion','?')}/5 | "
            f"무게: {p.get('weight','?')}/5 | 거리: {p.get('distance','?')} | "
            f"통기: {p.get('breathability','?')}/5 | 착용감: {p.get('fit','?')}/5\n"
            f"  리뷰 요약: {p.get('summary', '정보 없음')}"
        )
        lines.append(line)

    return "\n\n".join(lines)
```

### 2.4 추천 실행 함수

```python
import anthropic, json

client = anthropic.Anthropic()

def get_recommendations(user_profile: dict, profiles: list[dict]) -> dict:
    shoes_db = format_shoes_for_prompt(profiles, user_profile.get('budget'))

    prompt = RECOMMENDATION_PROMPT.format(
        running_distance_label = DISTANCE_LABELS.get(user_profile.get('running_distance'), '?'),
        frequency_label        = FREQUENCY_LABELS.get(user_profile.get('frequency'), '?'),
        foot_width_label       = WIDTH_LABELS.get(user_profile.get('foot_width'), '?'),
        preferred_cushion      = user_profile.get('preferred_cushion', 3),
        priorities_label       = ', '.join([PRIORITY_LABELS.get(p,'?') for p in user_profile.get('priorities', [])]) or '없음',
        budget_label           = BUDGET_LABELS.get(user_profile.get('budget')),
        free_text              = user_profile.get('free_text', '없음') or '없음',
        shoes_database         = shoes_db,
    )

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )

    result = json.loads(response.content[0].text.strip())

    # 추천 결과에 제품 상세 정보 병합
    profiles_map = {str(p['goods_no']): p for p in profiles}
    for rec in result.get('recommendations', []):
        product = profiles_map.get(str(rec['goods_no']), {})
        rec.update({
            "goods_name": product.get('goods_name', ''),
            "brand":      product.get('brand', ''),
            "price":      product.get('price', 0),
            "thumbnail":  product.get('thumbnail', ''),
            "url":        product.get('url', ''),
            "attributes": {
                "width":         product.get('width'),
                "cushion":       product.get('cushion'),
                "weight":        product.get('weight'),
                "distance":      product.get('distance'),
                "breathability": product.get('breathability'),
                "fit":           product.get('fit'),
            }
        })

    return result
```

---

## 3. 방식 B: 로컬 규칙 기반 매칭 (JavaScript)

```javascript
// 서버 없이 GitHub Pages에서도 동작하는 폴백 버전
async function getLocalRecommendations(userProfile) {
    const profiles = await fetch('./data/product_profiles.json').then(r => r.json());

    const scored = profiles
        .filter(p => p.width !== null && p.cushion !== null)
        .map(p => ({
            ...p,
            match_score: calculateMatchScore(userProfile, p),
            highlight_features: getHighlightFeatures(p),
            reason: generateReason(userProfile, p),
            caution: getCaution(p),
        }))
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 3)
        .map((p, i) => ({ ...p, rank: i + 1 }));

    return {
        recommendations: scored,
        overall_advice: generateOverallAdvice(userProfile, scored),
    };
}

function calculateMatchScore(user, shoe) {
    let score = 0;

    // 발볼 매칭 (40점, 가장 중요)
    const widthMap = { wide: '넓음', normal: '보통', narrow: '좁음' };
    if (shoe.width === widthMap[user.foot_width]) score += 40;
    else if (shoe.width === '보통') score += 20;
    else if (user.foot_width === 'wide' && shoe.width === '좁음') score -= 20; // 페널티

    // 쿠션 매칭 (30점)
    const cushionDiff = Math.abs((shoe.cushion || 3) - (user.preferred_cushion || 3));
    score += Math.max(0, 30 - cushionDiff * 10);

    // 거리 매칭 (20점)
    const distMap = { short: '단거리', medium: '중거리', long: '장거리', marathon: '장거리' };
    if (shoe.distance === distMap[user.running_distance]) score += 20;
    else if (shoe.distance === '전거리') score += 15;

    // 예산 (10점)
    const budgetMax = { low: 70000, mid: 120000, high: 200000, premium: Infinity };
    const maxPrice = budgetMax[user.budget] ?? Infinity;
    if (parseInt(shoe.price) <= maxPrice) score += 10;

    return Math.max(0, Math.min(100, score));
}

function generateReason(user, shoe) {
    const widthMap = { wide: '넓은 발볼', normal: '보통 발볼', narrow: '좁은 발볼' };
    const distMap  = { short: '단거리 조깅', medium: '10km 내외 훈련', long: '장거리 훈련', marathon: '마라톤' };
    return `${widthMap[user.foot_width] || ''}에 맞는 ${shoe.width} 발볼 설계이며, `
         + `쿠션감 ${shoe.cushion}/5로 ${distMap[user.running_distance] || '러닝'}에 적합합니다. `
         + `전반적 착용감 ${shoe.fit}/5 평가를 받고 있습니다. ${shoe.summary || ''}`;
}
```

---

## 4. FastAPI 백엔드 서버 (`backend/main.py`)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json, anthropic

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# 서버 시작 시 프로필 DB 로드
with open("data/product_profiles.json", encoding="utf-8") as f:
    PROFILES = json.load(f)

client = anthropic.Anthropic()

class UserProfile(BaseModel):
    running_distance: str
    foot_width: str
    frequency: str = "casual"
    preferred_cushion: int = 3
    priorities: list[str] = []
    budget: str | None = None
    free_text: str = ""

class RecommendRequest(BaseModel):
    user_profile: UserProfile


@app.post("/api/recommend")
async def recommend(req: RecommendRequest):
    result = get_recommendations(req.user_profile.dict(), PROFILES)
    return result


@app.get("/api/products")
async def get_products(
    width: str | None = None,
    distance: str | None = None,
    max_price: int | None = None
):
    filtered = PROFILES
    if width:     filtered = [p for p in filtered if p.get('width') == width]
    if distance:  filtered = [p for p in filtered if p.get('distance') == distance]
    if max_price: filtered = [p for p in filtered if int(p.get('price',0)) <= max_price]
    return {"total": len(filtered), "products": filtered}
```

### 실행 방법

```bash
cd KAIST/
pip install fastapi uvicorn anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 5. API 명세

### POST /api/recommend

**요청**
```json
{
  "user_profile": {
    "running_distance": "long",
    "frequency": "regular",
    "foot_width": "wide",
    "preferred_cushion": 4,
    "priorities": ["protection", "comfort"],
    "budget": "mid",
    "free_text": "평발이라 발바닥이 자주 아파요"
  }
}
```

**응답**
```json
{
  "recommendations": [
    {
      "goods_no": "3901126",
      "rank": 1,
      "match_score": 88,
      "goods_name": "NBPFGS150K / W480SK5 (4E) (BLACK)",
      "brand": "뉴발란스",
      "price": 99000,
      "thumbnail": "https://image.msscdn.net/...",
      "url": "https://www.musinsa.com/products/3901126",
      "reason": "발볼이 넓으신 분께 4E 와이드 핏으로 설계되어 전족부 압박이 없습니다. 쿠션감 4/5로 장거리 훈련 시 무릎 보호에 적합하며, 평발 고객의 아치 지지에도 효과적입니다.",
      "highlight_features": ["4E 와이드 핏", "높은 쿠션", "평발 지지"],
      "caution": null,
      "attributes": {
        "width": "넓음",
        "cushion": 4,
        "weight": 3,
        "distance": "장거리",
        "breathability": 3,
        "fit": 4
      }
    }
  ],
  "overall_advice": "발볼이 넓고 평발이신 분께는 쿠션과 아치 지지가 핵심입니다. 처음에는 1순위 추천으로 시작하시고, 발이 강화되면 경량 모델을 고려해 보세요."
}
```

### GET /api/products

```
GET /api/products?width=넓음&distance=장거리&max_price=120000

응답:
{
  "total": 3,
  "products": [ ...프로필 목록... ]
}
```

---

## 6. 캐싱 전략

```
[신발 속성 DB (product_profiles.json)]
  ✅ 서버 시작 시 메모리에 로드
  ✅ 갱신 필요 시: 크롤링 → 추출 파이프라인 재실행 → 서버 재시작

[추천 결과]
  현재: 캐시 없음 (LLM 호출 ~$0.01/회)
  향후: 동일 user_profile hash → 24시간 캐시
```

---

## 7. 비용 및 성능

| 항목 | 수치 |
|------|------|
| LLM 추천 1회 비용 | ~$0.01 (claude-sonnet) |
| 평균 응답 시간 | 2~4초 |
| 발표 데모 예상 호출 | 100회 |
| 데모 총 비용 | ~$1.00 |
| GitHub Pages 비용 | 무료 |
