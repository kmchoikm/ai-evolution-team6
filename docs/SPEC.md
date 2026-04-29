# SPEC
## 무신사 러닝화 리뷰 기반 AI 추천 시스템 — 기술 명세서

버전: 1.0  
---

## 1. 서비스 개요

### 1.1 서비스명
- 정식명: 무신사 러닝화 AI 추천 시스템
- 코드명: SoleMate / RunFit

### 1.2 핵심 가치 제안
소비자 리뷰 텍스트를 NLP로 분석하여 러닝화별 6대 속성(무게감·쿠션감·디자인·가격·발볼·착용감) 선호도 프로필을 생성하고, 이를 기반으로 유사 제품 추천 및 개인화 추천을 제공한다.

### 1.3 타깃 사용자
- 러닝을 시작한 MZ 세대 (20~40대)
- 자신의 취향에 맞는 러닝화를 효율적으로 탐색하고 싶은 소비자
- 처음 러닝화를 구매하는 초보 러너

### 1.4 서비스 범위 (MVP)
- **In Scope**: 무신사 러닝화 카테고리 내 상위 50개 제품에 대한 속성 프로필 생성 및 추천
- **Out of Scope**: 실시간 리뷰 수집, 타 카테고리 확장, 개인 계정 연동

---

## 2. 시스템 아키텍처

### 2.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                        데이터 레이어                              │
│                                                                  │
│  무신사 리뷰 데이터  →  전처리 파이프라인  →  속성 점수 DB         │
│  (텍스트, 제품 ID,       (OKT + KSS +          (제품별 벡터)     │
│   평점, 날짜)             KNU SentiLex)                          │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        비즈니스 로직 레이어                        │
│                                                                  │
│  속성 프로필 생성기  →  코사인 유사도 계산기  →  추천 엔진         │
│                                                                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────┐
│                        프레젠테이션 레이어                         │
│                                                                  │
│  카테고리 목록 페이지    제품 상세 페이지    AI 추천 모달           │
│  (속성 필터 UI)         (유사 제품 추천)    (자유형 텍스트 입력)   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 기술 스택

| 레이어 | 기술 | 용도 |
|-------|------|------|
| 데이터 수집 | Python + BeautifulSoup / 공식 API | 리뷰 데이터 수집 |
| 형태소 분석 | OKT (Open Korean Text) | 한국어 어간 복원, 품사 태깅 |
| 문장 분리 | KSS (Korean Sentence Splitter) | 문장 단위 분리 |
| 감성 분석 | KNU SentiLex | 단어별 감성 점수 |
| 유사도 계산 | NumPy + SciPy (cosine_similarity) | 제품 간 코사인 유사도 |
| 백엔드 (선택) | FastAPI (Python) | 추천 API 서버 |
| DB | SQLite (개발) / PostgreSQL (프로덕션) | 제품 프로필 저장 |
| 프론트엔드 | HTML + Tailwind CSS + Vanilla JS | 무신사 UI 프로토타입 |
| 시각화 | Chart.js (레이더 차트) | 속성 프로필 표시 |

---

## 3. 데이터 명세

### 3.1 수집 대상 데이터

#### 제품 데이터
```
products (테이블)
─────────────────────────────────────
product_id      VARCHAR(20)  PK    무신사 제품 ID
brand           VARCHAR(50)        브랜드명 (Nike, Adidas 등)
name            VARCHAR(200)       제품명
price           INTEGER            정가 (원)
sale_price      INTEGER            할인가 (원, nullable)
image_url       TEXT               대표 이미지 URL
category        VARCHAR(50)        카테고리 (러닝화 고정)
created_at      TIMESTAMP          수집 일시
updated_at      TIMESTAMP          최종 업데이트
```

#### 리뷰 데이터
```
reviews (테이블)
─────────────────────────────────────
review_id       VARCHAR(50)  PK    리뷰 고유 ID
product_id      VARCHAR(20)  FK    제품 ID
rating          FLOAT              전체 평점 (1.0~5.0)
body            TEXT               리뷰 텍스트 원문
size_purchased  VARCHAR(10)        구매 사이즈 (nullable)
created_at      TIMESTAMP          리뷰 작성일
is_processed    BOOLEAN            NLP 처리 완료 여부
```

#### 속성 점수 데이터
```
product_profiles (테이블)
─────────────────────────────────────
product_id      VARCHAR(20)  PK    제품 ID
review_count    INTEGER            분석에 사용된 리뷰 수
score_weight    FLOAT              무게감 선호도 점수 (-10.0 ~ 10.0)
score_cushion   FLOAT              쿠션감 선호도 점수 (-10.0 ~ 10.0)
score_design    FLOAT              디자인 선호도 점수 (-10.0 ~ 10.0)
score_price     FLOAT              가격 선호도 점수 (-10.0 ~ 10.0)
score_width     FLOAT              발볼 선호도 점수 (-10.0 ~ 10.0)
score_fit       FLOAT              착용감 선호도 점수 (-10.0 ~ 10.0)
confidence      FLOAT              신뢰도 점수 (0.0 ~ 1.0, 리뷰 수 기반)
computed_at     TIMESTAMP          계산 일시
```

### 3.2 데이터 수집 대상 브랜드
나이키(Nike), 아디다스(Adidas), 뉴발란스(New Balance), 미즈노(Mizuno), 브룩스(Brooks), 써코니(Saucony), 아식스(ASICS), 온 클라우드(On Cloud), 호카(HOKA), 언더아머(Under Armour), 퓨마(PUMA), 살로몬(Salomon)

### 3.3 데이터 품질 기준
- 제품당 분석 대상 리뷰 최소 50건 이상 (미달 시 `confidence < 0.5` 표시)
- 리뷰 본문 길이 최소 20자 이상 (미달 시 필터링)
- 배송/포장 관련 리뷰 자동 제외: 키워드 `["배송", "포장", "선물", "박스", "재구매 예정"]` 포함 비율 > 80% 이면 제외
- 수집 주기: 월 1회 전체 갱신

---

## 4. NLP 파이프라인 명세

### 4.1 전체 처리 흐름

```
[입력] 리뷰 텍스트 (raw string)
    │
    ▼
[STEP 1] 텍스트 전처리
    - 특수문자, HTML 태그 제거
    - 이모지 처리 (긍/부정 매핑 또는 제거)
    - 반복 문자 정규화 ("너무너무너무" → "너무")
    │
    ▼
[STEP 2] KSS 문장 분리
    - 하나의 리뷰를 개별 문장 리스트로 분리
    - 출력: ["무게는 가벼운데,", "가격이 비싸다."]
    │
    ▼
[STEP 3] OKT 형태소 분석 (문장별)
    - 어간 추출 (stem=True): "이쁘다" → "예쁘다"
    - 품사 태깅: 명사(Noun), 형용사(Adjective), 동사(Verb) 추출
    │
    ▼
[STEP 4] 속성 키워드 감지 (문장별)
    - 6대 속성 키워드 사전 매칭
    - 하나의 문장에서 감지된 속성 목록 반환
    │
    ▼
[STEP 5] KNU SentiLex 감성 점수 계산 (문장별)
    - 문장 내 각 형용사/동사의 감성 점수 합산
    - 부정 전치어 처리 ("별로", "아쉽다", "안 좋다" → 점수 부호 반전)
    │
    ▼
[STEP 6] 속성별 점수 집계 (제품 전체 리뷰)
    - 속성별 감성 점수의 평균 계산
    - 정규화: [-10, +10] 범위로 변환
    │
    ▼
[출력] 제품 속성 프로필 벡터
    {무게감: 2.1, 쿠션감: 3.5, 디자인: 4.0, 가격: -1.2, 발볼: 1.8, 착용감: 2.9}
```

### 4.2 6대 속성 키워드 사전

| 속성 | 키워드 (예시) |
|------|-------------|
| 무게감 | 무게, 무겁다, 가볍다, 경량, 묵직하다, 발이 무겁다 |
| 쿠션감 | 쿠션, 쿠셔닝, 충격흡수, 말랑하다, 딱딱하다, 푹신하다, 탄성, 부스트 |
| 디자인 | 디자인, 예쁘다, 이쁘다, 스타일, 색상, 컬러, 촌스럽다, 멋있다 |
| 가격 | 가격, 비싸다, 저렴하다, 가성비, 갓성비, 합리적이다 |
| 발볼 | 발볼, 발 폭, 좁다, 넓다, 발가락, 조이다, 넉넉하다, 타이트하다 |
| 착용감 | 착용감, 편하다, 불편하다, 발이 아프다, 핏, 사이즈, 발 감싸기 |

### 4.3 부정 전치어 처리 규칙

```python
NEGATION_WORDS = ["안", "못", "별로", "아쉽다", "아쉽게도", "기대이하", 
                   "실망", "그다지", "그닥", "별루", "글쎄"]

def apply_negation(tokens, score):
    # 감성 점수 계산 직전 토큰에 부정어 존재 시 부호 반전
    if any(neg in tokens for neg in NEGATION_WORDS):
        return -score
    return score
```

### 4.4 신뢰도(Confidence) 계산

```python
def compute_confidence(review_count: int) -> float:
    """
    리뷰 수 기반 신뢰도:
    - 0~49건:  0.0 ~ 0.49 (낮음)
    - 50~199건: 0.5 ~ 0.79 (보통)
    - 200건+:   0.8 ~ 1.0 (높음)
    """
    if review_count < 50:
        return review_count / 100.0
    elif review_count < 200:
        return 0.5 + (review_count - 50) / 500.0
    else:
        return min(1.0, 0.8 + (review_count - 200) / 1000.0)
```

---

## 5. 추천 알고리즘 명세

### 5.1 유사 제품 추천 (Similar Item Recommendation)

**입력**: 기준 제품 ID  
**출력**: 유사도 기준 Top-N 추천 제품 리스트 (유사도 점수, 주요 유사 속성 포함)

```python
import numpy as np
from scipy.spatial.distance import cosine

def get_similar_products(
    target_product_id: str, 
    all_profiles: dict,  # {product_id: np.array([6개 속성 점수])}
    top_n: int = 5
) -> list[dict]:
    
    target_vector = all_profiles[target_product_id]
    similarities = []
    
    for pid, vector in all_profiles.items():
        if pid == target_product_id:
            continue
        
        sim_score = 1 - cosine(target_vector, vector)
        
        # 가장 유사한 속성 찾기
        attr_names = ["무게감", "쿠션감", "디자인", "가격", "발볼", "착용감"]
        diff = np.abs(target_vector - vector)
        most_similar_attr = attr_names[np.argmin(diff)]
        
        similarities.append({
            "product_id": pid,
            "similarity": round(sim_score * 100, 1),  # 퍼센트 표시
            "similar_reason": f"{most_similar_attr}이 비슷해요"
        })
    
    return sorted(similarities, key=lambda x: x["similarity"], reverse=True)[:top_n]
```

**출력 예시**:
```json
[
  {"product_id": "4590231", "similarity": 93.2, "similar_reason": "쿠션감이 비슷해요"},
  {"product_id": "1762406", "similarity": 87.1, "similar_reason": "디자인이 비슷해요"},
  {"product_id": "2353322", "similarity": 72.4, "similar_reason": "발볼 넓이가 비슷해요"}
]
```

### 5.2 개인화 추천 (AI 텍스트 입력 기반)

**입력**: 사용자 자유형 텍스트 (예: "평발이고 장거리 마라톤 준비 중. 쿠션이 중요해요")  
**출력**: 사용자 요구에 맞는 제품 추천

```
[처리 흐름]
1. 입력 텍스트에서 속성 키워드 추출
   → "쿠션" 감지 → 쿠션감 중요
   → "장거리" 감지 → 무게감도 중요
   
2. 사용자 선호 벡터 생성
   → [무게: 높음, 쿠션: 매우 높음, 나머지: 중립]
   
3. 사용자 벡터와 제품 프로필 벡터 간 유사도 계산
   → 상위 3개 제품 추천
   
4. 추천 이유 생성
   → "리뷰 {N}건 기준, 이 제품은 쿠션감 관련 언급이 높고 
       가볍다는 평이 많습니다."
```

---

## 6. API 명세

### 6.1 엔드포인트 목록

#### GET /api/products
러닝화 제품 목록 조회 (속성 필터 지원)

**파라미터**:
```
GET /api/products?sort_by=cushion&order=desc&limit=20&offset=0

sort_by: weight | cushion | design | price | width | fit | default
order:   asc | desc
limit:   정수 (기본값: 20)
offset:  정수 (기본값: 0)
```

**응답**:
```json
{
  "total": 142,
  "products": [
    {
      "product_id": "4590231",
      "brand": "adidas",
      "name": "울트라부스트 5 IE1111",
      "price": 125400,
      "profile": {
        "weight": 1.2,
        "cushion": 4.3,
        "design": 3.8,
        "price_value": -1.5,
        "width": 2.1,
        "fit": 3.0,
        "confidence": 0.72
      }
    }
  ]
}
```

#### GET /api/products/{product_id}/similar
유사 제품 추천 조회

**파라미터**:
```
GET /api/products/4590231/similar?top_n=5
```

**응답**:
```json
{
  "source_product_id": "4590231",
  "recommendations": [
    {
      "product_id": "1762406",
      "brand": "SALOMON",
      "name": "XT-6 Black/Black/Phantom",
      "similarity_score": 87.1,
      "similar_reason": "디자인이 비슷해요",
      "profile": { ... }
    }
  ]
}
```

#### POST /api/recommend/text
자유형 텍스트 기반 개인화 추천

**요청**:
```json
{
  "query": "평발이고 하프 마라톤을 준비 중이에요. 쿠션이 중요하고 가벼운 신발을 원해요",
  "top_n": 3
}
```

**응답**:
```json
{
  "query": "평발이고 하프 마라톤을...",
  "detected_attributes": ["쿠션감", "무게감"],
  "recommendations": [
    {
      "product_id": "3901126",
      "brand": "New Balance",
      "name": "W480SK5",
      "reason": "리뷰 237건 기준, 쿠션감이 우수하고 가볍다는 평이 많습니다.",
      "profile": { ... }
    }
  ]
}
```

---

## 7. 프론트엔드 명세

### 7.1 카테고리 목록 페이지 (무게감+AI 시연.html)

#### 컴포넌트 목록

| 컴포넌트 | 기능 |
|---------|------|
| 속성 필터 바 | 무게감/쿠션감/발볼넓이/디자인 필터 버튼 (클릭 시 해당 속성 점수 기준 정렬) |
| ✨ AI 추천 버튼 | AI 추천 모달 트리거 |
| 제품 그리드 | 2~4열 반응형 제품 카드 목록 |
| AI 추천 모달 | 자유형 텍스트 입력 → 로딩 → 추천 결과 표시 |

#### 속성 필터 동작 명세
```javascript
// 무게감 버튼 클릭 시
sortByWeightBtn.addEventListener('click', () => {
    // API: GET /api/products?sort_by=weight&order=asc
    // 낮은 무게감 점수(가벼운 제품)부터 정렬
    fetchAndRenderProducts({ sort_by: 'weight', order: 'asc' });
});
```

#### AI 모달 상태 흐름
```
[닫힘] → (AI 추천 클릭) → [입력 화면] → (제출) → [로딩 중] → [결과 표시]
                                ↑                                    │
                                └────────────── (다시 추천) ──────────┘
```

### 7.2 제품 상세 페이지 (제품상세페이지_유사제품추천.html)

#### 탭 구성

| 탭 | 내용 |
|----|------|
| 상품 정보 | 브랜드 제품 설명, 상세 이미지 |
| 추천 | 유사 제품 추천 (수평 스크롤 카드) |
| 사이즈 | 한국/미국/영국/유럽 사이즈 변환표 |
| 후기 | 사용자 리뷰 목록 |
| 문의 | 상품 문의 |

#### 유사 제품 추천 카드 명세
```
┌──────────────────────┐
│    [제품 이미지]      │
│                      │
│  [쿠션감이 비슷해요]  │  ← 유사 이유 태그
│                      │
│  BRAND               │
│  제품명 (truncate)   │
│  ₩ 가격              │
└──────────────────────┘
너비: 220px 고정 (flex-shrink: 0)
```

### 7.3 레이더 차트 (속성 프로필 시각화)

```javascript
// Chart.js 설정 예시
const radarConfig = {
    type: 'radar',
    data: {
        labels: ['무게감', '쿠션감', '디자인', '가격', '발볼', '착용감'],
        datasets: [{
            label: '제품 A',
            data: [2.1, 4.3, 3.8, 1.5, 2.1, 3.0],
            // 점수를 0~5 스케일로 정규화하여 표시
        }]
    },
    options: {
        scales: { r: { min: 0, max: 5 } }
    }
};
```

---

## 8. 성능 지표 (KPI)

### 8.1 모델 품질 지표

| 지표 | 목표값 | 측정 방법 |
|------|-------|---------|
| 속성 분류 정확도 | ≥ 80% | 전문 러너 50개 리뷰 수동 라벨링 후 비교 |
| 감성 분류 정확도 | ≥ 75% | 긍정/부정 50:50 샘플 수동 검증 |
| 추천 수용률 | ≥ 40% | AI 추천 클릭 후 장바구니/구매 전환 |

### 8.2 서비스 성능 지표

| 지표 | 목표값 |
|------|-------|
| API 응답 시간 (추천) | < 200ms (사전 계산 캐시 사용 시) |
| API 응답 시간 (텍스트 추천) | < 3,000ms |
| 월간 리뷰 갱신 처리 시간 | < 1시간 |
| 시스템 가용성 | ≥ 99.0% |

### 8.3 비즈니스 성능 지표

| 지표 | 목표값 |
|------|-------|
| AI 추천 버튼 CTR | ≥ 5% |
| 추천 경유 구매 전환율 | 기존 대비 +15% |
| 품절 시 대체 구매 유도율 | ≥ 20% |

---

## 9. 개발 로드맵

### Phase 1: 데이터 및 모델 검증 (MVP) — 4주
- [ ] 러닝화 상위 50개 제품 리뷰 수집
- [ ] NLP 파이프라인 구현 (OKT + KSS + SentiLex)
- [ ] 제품 속성 프로필 생성 및 정확도 검증
- [ ] 코사인 유사도 기반 추천 알고리즘 구현

### Phase 2: 프로토타입 완성 — 2주
- [ ] 카테고리 목록 페이지 속성 필터 연동
- [ ] 제품 상세 페이지 유사 추천 섹션 완성
- [ ] AI 추천 모달 텍스트 → 추천 흐름 완성
- [ ] 레이더 차트 시각화

### Phase 3: 검증 및 개선 — 2주
- [ ] 전문 러너 5~10인 UX 테스트
- [ ] 모델 정확도 측정 및 키워드 사전 보완
- [ ] 성능 최적화 (캐싱, 응답 시간 단축)

### Phase 4: 확장 (중장기)
- [ ] BERT 기반 감성 분석 모델 전환
- [ ] 신제품 스펙 기반 예측 태깅
- [ ] 등산화, 농구화 등 타 스포츠화 카테고리 확장
- [ ] 사용자 계정 연동 개인화 (구매 이력 기반)

---

## 10. 제약 사항 및 가정

### 제약 사항
1. 무신사 공식 API 없이 공개 데이터만 사용하는 경우 데이터 수집에 제약이 있을 수 있음
2. KNU SentiLex는 일반 도메인 기반으로 러닝화 특화 용어에 점수가 없을 수 있음
3. 리뷰 수가 적은 제품은 통계적 신뢰도가 낮으며 이를 사용자에게 명시적으로 표시

### 가정
1. 무신사 러닝화 카테고리의 한국어 리뷰가 분석의 주 데이터 소스
2. 소비자 리뷰에 제품 속성에 대한 실질적인 정보가 충분히 포함되어 있음
3. 6대 속성(무게감, 쿠션감, 디자인, 가격, 발볼, 착용감)이 러닝화 선택의 핵심 기준을 커버함

---

*이 문서는 살아있는 명세서입니다. 개발 진행에 따라 업데이트됩니다.*
