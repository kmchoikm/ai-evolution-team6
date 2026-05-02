# SPEC — STEP 1: 데이터 파이프라인
## 리뷰 수집 + LLM 기반 속성 추출

담당: 데이터 수집 / NLP 담당자
버전: 2.0 | 날짜: 2025.06

---

## 개요

이 단계의 목표: 무신사 리뷰 텍스트를 **6개 신발 속성 점수**로 변환하여 `product_profiles.json`을 만드는 것.

```
무신사 크롤링
    │
    ▼
products.csv (30개 제품)
reviews.csv  (466건 리뷰)
    │
    ▼
LLM 배치 처리 (Claude Haiku)
    │
    ▼
product_profiles.json (속성 점수 DB)
```

---

## 1. 현재 수집 완료 데이터

### 1.1 수집 현황 (2025.06 기준)

| 항목 | 수량 | 비고 |
|------|------|------|
| 수집 제품 수 | 30개 | 무신사 러닝화 인기순 상위 |
| 수집 리뷰 수 | 466건 | 제품당 평균 15.5건 |
| 수집 파일 | products.csv, reviews.csv | `crawler/data/` 폴더 |
| 알려진 버그 | 페이지네이션 미작동 | 제품당 20건으로 제한됨 (수정 예정) |

### 1.2 수집 제품 목록 (products.csv 전체)

| goods_no | 브랜드 | 제품명 | 가격 | 리뷰수 |
|---------|--------|--------|------|--------|
| 3862529 | 미즈노 | (공용) 맥시마이저 26 - 그레이:화이트 | 54,990원 | 1,460 |
| 5174704 | 노스페이스 | NS93R02A 레이 스트라이드_REAL BLACK | 59,000원 | 55 |
| 5916487 | 아디다스 | 슈퍼노바 이즈 2 M JQ4254 | 79,200원 | 15 |
| 6245530 | 커버낫 | [커버낫 X 미즈노] 웨이브 다이치 LS 브라운 | 209,000원 | 6 |
| 3428602 | 미즈노 | (공용) 맥시마이저 25 - 오이스터 머쉬룸:블랙 | 79,000원 | 1,807 |
| 5360128 | 미즈노 | (공용) 맥시마이저 27 - 블랙:블랙 샌드 | 79,000원 | 165 |
| 3901126 | 뉴발란스 | NBPFGS150K / W480SK5 (4E) (BLACK) | 99,000원 | 1,901 |
| 4039813 | 리복 | 프리미어 플로트직 쉐도우 - 화이트 | 111,300원 | 15 |
| 5890439 | 리복 | 차지런 - 그레이 | 79,000원 | 10 |
| 4836543 | 나이키 | 페가수스 41 M - 블랙:앤트러사이트:블랙 | 159,000원 | 70 |
| 4290142 | 미즈노 | (공용) 웨이브 라이더 10 - 스노우 화이트 | 126,990원 | 156 |
| 5277377 | 나이키 | 보메로 플러스 W - 블랙:메탈릭 다크 그레이 | 209,000원 | 63 |
| 4982686 | 미즈노 | MAXIMIZER 26_K1GA240002 | 63,200원 | 37 |
| 5882655 | 아디다스 | 아디스타 4 - 클라우드화이트:클리어오렌지 | 94,990원 | 3 |
| 4172869 | 나이키 | 페가수스 41 W - 블랙:안트라사이트:화이트 | 111,300원 | 146 |
| 4425597 | 리복 | 프리미어 로드 플러스 VI - 베이지:블랙 | 65,400원 | 8 |
| 5042974 | 아디다스 | 아디제로 EVO SL W - 블랙:실버 | 209,000원 | 62 |
| 6246970 | 아디다스 | 송 포 더 뮤트 슈퍼노바 라이즈 3 러닝화 | 169,000원 | 6 |
| 4298289 | 호카 | (공용) 마파테 스피드 2 - 블랙:캐슬락 | 239,000원 | 92 |
| 5360132 | 미즈노 | (공용) MXR - 실버:실버:님버스 클라우드 | 134,990원 | 5 |
| 5888837 | 아디다스 | 아디제로 보스턴 13 W - 화이트:실버 | 179,000원 | 16 |
| 3796833 | 데상트 | 에너자이트 Z 라이트 러닝화 블루 | 74,500원 | 8 |
| 5360123 | 미즈노 | (공용) 맥시마이저 27 - 프리스틴:윈드 차임 | 54,990원 | 5 |
| 4171285 | 뉴발란스 | NBPFFS112W / 아리쉬 V4 (여성, D) (WHITE) | 109,000원 | 86 |
| 5173980 | 나이키 | 보메로 18 W - 화이트:포톤 더스트 | 189,000원 | 40 |
| 3863542 | 리복 | 프리미어 로드 플러스 VI - 실버:블루 | 54,500원 | 34 |
| 4852386 | 노스페이스 | NS93R44J 화이트라벨 슈퍼 킥스 2 EX_IVORY | 89,000원 | 72 |
| 4344805 | 하버드슈즈 | 머레이 메쉬 에어 런닝화 블랙 | 25,800원 | 111 |
| 4441361 | 험토 | 여성 쿠션 트레일화 젤다스피드 TRC | 109,000원 | 22 |
| 5982685 | 아디다스 | 슈퍼노바 이즈 2 W JQ4244 | 99,000원 | 10 |

### 1.3 수집 리뷰 샘플 (reviews.csv 앞부분)

| review_no | goods_no | 별점 | 리뷰 내용 (앞 70자) | 사이즈 | 작성일 |
|-----------|---------|------|-------------------|--------|--------|
| 83708848 | 3862529 | 5 | 가성비가 너무 좋아요 뒷축 잘 잡아주면서 쿠션감도 빵빵하고 엄청 편해요~ | 270 | 2026-04-15 |
| 83953242 | 3862529 | 5 | 정핏으로 가면 되고 발볼 있으신분은 반업 정도 하심 좋을것 같아요. | 270 | 2026-04-28 |
| 84027509 | 3862529 | 4 | 신발이 너무가볍네요. 데일리로 안성맞춤인 신발입니다 | 280 | 2026-04-28 |
| 84024577 | 3862529 | 5 | 가격대비 너무 좋네요 쿠션감도 괜찮고 오래신어도 괜찮은같아요 | 270 | 2026-04-28 |
| 84008382 | 3862529 | 5 | 사진보다 실물이 훨씬 이쁘고 착화감도 좋아요. 발볼도 넓게 나와서 좋습니다! | 280 | 2026-04-27 |
| 84001180 | 3862529 | 4 | 착용감은 부드러워서 편해요. 사이즈 폭이 다소 작은감이 느껴집니다. | 280 | 2026-04-27 |
| 83979983 | 3862529 | 5 | 가볍고 착화감이 너무 좋습니다 그리고 색깔도 잘 빠져서 이 가격에 이런 디자인이면 | 265 | 2026-04-26 |
| 83970563 | 3862529 | 5 | 가격대비 쿠션감도 좋고 발 안아프고 편안하네요 오래 걸어도 괜찮아요 | 270 | 2026-04-26 |

---

## 2. 데이터 스키마

### products.csv 컬럼

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| goods_no | int | 무신사 제품 ID | 3862529 |
| goods_name | str | 제품 전체명 | (공용) 맥시마이저 26 - 그레이... |
| brand | str | 브랜드명 (한글) | 미즈노 |
| brand_en | str | 브랜드 영문코드 | mizuno |
| price | int | 현재 판매가 (원) | 54990 |
| normal_price | int | 정가 (원) | 79000 |
| sale_rate | int | 할인율 (%) | 30 |
| is_sold_out | bool | 품절 여부 | False |
| thumbnail | str | 대표 이미지 URL | https://image.msscdn.net/... |
| url | str | 무신사 제품 페이지 URL | https://www.musinsa.com/products/... |
| gender | str | 성별 | 공용 / 남성 / 여성 |
| avg_rating | float | 평균 별점 (수집 버그로 현재 null) | null |
| review_count | int | 전체 리뷰 수 | 1460 |

### reviews.csv 컬럼

| 컬럼명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| review_no | int | 리뷰 고유 ID | 83708848 |
| goods_no | int | 제품 ID (FK) | 3862529 |
| grade | int | 별점 (1~5) | 5 |
| content | str | 리뷰 텍스트 원문 | "가성비가 너무 좋아요..." |
| size_option | str | 구매 사이즈 | 270 |
| like_count | int | 좋아요 수 | 1 |
| has_image | bool | 이미지 첨부 여부 | True |
| user_height | int | 작성자 키 (cm, 미공개 시 0) | 175 |
| user_weight | int | 작성자 몸무게 (kg, 미공개 시 0) | 70 |
| created_at | str | 작성일시 (ISO 8601) | 2026-04-15T20:37:51.000+09:00 |

---

## 3. LLM 기반 속성 추출

### 3.1 왜 LLM인가?

기존 규칙 기반 NLP(OKT + KNU SentiLex) 대신 LLM을 사용하는 이유:

| 문제 상황 | 규칙 기반 실패 예 | LLM 처리 결과 |
|---------|----------------|------------|
| 반어법 | "가볍다더니 진짜 무겁네" → 긍정 오분류 | 정확히 부정으로 처리 |
| 브랜드 용어 | "부스트", "에너지 리턴" → 사전 없음 | 문맥으로 쿠션감 추출 |
| MZ 신조어 | "갓성비", "존편" → 사전 없음 | 긍정 감성 정확 인식 |
| 복합 문장 | "발볼 좁아서 넓은 발엔 비추" → 오분류 위험 | width=좁음 정확 추출 |

### 3.2 추출 대상 속성 6개

| 속성 | 코드명 | 척도 | 의미 |
|------|--------|------|------|
| 발볼 두께 | `width` | 좁음 / 보통 / 넓음 | 전족부 공간 여유 |
| 쿠션감 | `cushion` | 1(딱딱) ~ 5(물렁) | 충격흡수, 착지감 |
| 무게감 | `weight` | 1(매우가벼움) ~ 5(매우무거움) | 착용 시 무게 체감 |
| 추천 거리 | `distance` | 단거리 / 중거리 / 장거리 / 전거리 | 적합한 러닝 거리 |
| 통기성 | `breathability` | 1(나쁨) ~ 5(좋음) | 발 내부 열 배출 |
| 착용감 | `fit` | 1(불편) ~ 5(편함) | 전반적 편안함 |

### 3.3 속성 추출 프롬프트

```python
EXTRACTION_PROMPT = """
당신은 러닝화 리뷰 분석 전문가입니다.
아래 리뷰들을 읽고 이 신발의 속성을 JSON으로 추출해 주세요.

[리뷰 목록]
{reviews_text}

[추출 규칙]
- 언급이 없는 속성은 null로 표시
- 상반된 의견이 있으면 다수 의견 기준으로 판단
- 부정 표현에 주의 ("발볼이 좁다" → width: "좁음")
- 숫자 척도는 전체 리뷰의 평균적 인상을 반영

[출력 형식 - JSON만 출력, 설명 없이]
{{
  "width": "좁음" | "보통" | "넓음" | null,
  "cushion": 1~5 정수 (1=매우단단, 5=매우물렁) | null,
  "weight": 1~5 정수 (1=매우가벼움, 5=매우무거움) | null,
  "distance": "단거리" | "중거리" | "장거리" | "전거리" | null,
  "breathability": 1~5 정수 (1=매우나쁨, 5=매우좋음) | null,
  "fit": 1~5 정수 (1=매우불편, 5=매우편함) | null,
  "summary": "이 신발의 핵심 특징을 2~3줄로 요약 (한국어, 구매자 관점)"
}}
"""
```

### 3.4 배치 처리 코드 (`nlp/attribute_extractor.py`)

```python
import anthropic, json, csv, time
from pathlib import Path

client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경변수 필요

def extract_attributes(goods_no: str, reviews: list[dict]) -> dict:
    """리뷰 목록 → 속성 프로필 딕셔너리"""
    sample = reviews[:30]  # 최대 30건 (토큰 제한)
    reviews_text = "\n".join([
        f"[{i+1}] 별점{r['grade']}점: {r['content'][:200]}"
        for i, r in enumerate(sample)
    ])

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=500,
        messages=[{"role": "user", "content": EXTRACTION_PROMPT.format(
            reviews_text=reviews_text
        )}]
    )

    try:
        profile = json.loads(response.content[0].text.strip())
    except json.JSONDecodeError:
        # 파싱 실패 시 재시도 1회
        response2 = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=500,
            messages=[
                {"role": "user", "content": EXTRACTION_PROMPT.format(reviews_text=reviews_text)},
                {"role": "assistant", "content": response.content[0].text},
                {"role": "user", "content": "JSON 형식으로만 다시 출력해주세요."}
            ]
        )
        profile = json.loads(response2.content[0].text.strip())

    profile["goods_no"] = goods_no
    profile["review_count_used"] = len(sample)
    return profile


def run_extraction(
    products_csv: str = "crawler/data/products.csv",
    reviews_csv:  str = "crawler/data/reviews.csv",
    output_path:  str = "backend/data/product_profiles.json"
):
    """전체 제품 배치 속성 추출 실행"""
    with open(products_csv, encoding='utf-8-sig') as f:
        products = list(csv.DictReader(f))
    with open(reviews_csv, encoding='utf-8-sig') as f:
        all_reviews = list(csv.DictReader(f))

    # 제품별 리뷰 그룹핑
    reviews_by_product = {}
    for r in all_reviews:
        reviews_by_product.setdefault(r['goods_no'], []).append(r)

    profiles = []
    for i, product in enumerate(products):
        gno = str(product['goods_no'])
        reviews = reviews_by_product.get(gno, [])

        if len(reviews) < 3:
            print(f"[SKIP] {product['brand']} {product['goods_name'][:20]} — 리뷰 {len(reviews)}건")
            continue

        print(f"[{i+1:02d}] {product['brand']} {product['goods_name'][:25]} ({len(reviews)}건)")
        profile = extract_attributes(gno, reviews)
        profile.update({
            "goods_name":  product['goods_name'],
            "brand":       product['brand'],
            "brand_en":    product['brand_en'],
            "price":       int(product['price']),
            "normal_price":int(product['normal_price']),
            "thumbnail":   product['thumbnail'],
            "url":         product['url'],
            "gender":      product['gender'],
            "avg_rating":  product.get('avg_rating'),
            "total_review_count": product.get('review_count'),
        })
        profiles.append(profile)
        time.sleep(0.5)  # API 레이트 리밋 방지

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(profiles, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 완료: {len(profiles)}개 프로필 → {output_path}")


if __name__ == "__main__":
    run_extraction()
```

### 3.5 출력 예시 (`product_profiles.json` 1건)

```json
{
  "goods_no": "3862529",
  "goods_name": "(공용) 맥시마이저 26 - 그레이:화이트 / K1GA240012",
  "brand": "미즈노",
  "brand_en": "mizuno",
  "price": 54990,
  "normal_price": 79000,
  "thumbnail": "https://image.msscdn.net/images/goods_img/20240213/3862529/...",
  "url": "https://www.musinsa.com/products/3862529",
  "gender": "공용",
  "avg_rating": null,
  "total_review_count": 1460,
  "width": "보통",
  "cushion": 3,
  "weight": 2,
  "distance": "중거리",
  "breathability": 3,
  "fit": 4,
  "summary": "가성비 좋은 입문용 러닝화. 가볍고 착화감이 편하며 발볼은 보통~약간 좁은 편. 쿠션이 적당해 10km 내외 훈련에 적합하다는 평이 많음.",
  "review_count_used": 20
}
```

---

## 4. 데이터 품질 기준

| 조건 | 처리 방법 |
|------|---------|
| 리뷰 3건 미만 | 추출 건너뜀, 추천 제외 |
| 리뷰 3~9건 | 추출하되 낮은 신뢰도 표시 (`low_confidence: true`) |
| 리뷰 10건 이상 | 정상 추출 |
| LLM JSON 파싱 실패 | 재시도 1회 → 실패 시 전체 null |
| 배송/포장만 언급한 리뷰 | 크롤러 단계에서 사전 필터링 예정 |

---

## 5. 알려진 버그 및 개선 과제

| 버그 | 현재 증상 | 수정 방법 |
|------|----------|---------|
| 페이지네이션 미작동 | 제품당 20건만 수집 (1000건+ 제품도 동일) | `hasNext` 응답 경로 재확인, `page` 파라미터 증가 로직 수정 |
| avg_rating null | 모든 제품 평균 별점 수집 실패 | 리뷰 요약 API 응답 구조 `data.data.avgRating` 경로 확인 |

---

## 6. 실행 방법

```bash
# 1. 크롤링 (이미 완료)
cd KAIST/
python crawler/musinsa_crawler.py

# 2. 속성 추출 (ANTHROPIC_API_KEY 필요)
export ANTHROPIC_API_KEY="sk-ant-..."
python nlp/attribute_extractor.py

# 결과 확인
cat backend/data/product_profiles.json | python -m json.tool | head -50
```

---

## 7. 비용 및 시간 추정

| 항목 | 수치 |
|------|------|
| 속성 추출 대상 제품 | ~27개 (30개 중 리뷰 3건 이상) |
| 제품당 처리 시간 | ~3초 (API 응답 + 0.5초 슬립) |
| 전체 소요 시간 | ~90초 |
| claude-haiku 비용 | ~$0.15 (1회성) |
