# SPEC.md
## RunFit — 상세 기능 및 기술 명세서

이 문서는 RunFit 서비스의 MVP(Minimum Viable Product) 구현을 위한 상세 개발 스펙을 정의합니다. 모든 코드 작성 및 시스템 설계는 이 문서를 기준으로 진행됩니다.

---

### 1. 사용자 시나리오 (User Scenario)
> **목적:** 사용자가 서비스에 진입하여 결과를 얻기까지의 핵심 흐름 정의 (이탈률 최소화 관점)

1. **진입:** 사용자가 모바일 웹(`index.html`)에 접속하면 "3분 진단 — 7개 질문에 답하면 AI가 가장 적합한 러닝화를 추천합니다" 문구와 함께 단일 스크롤 폼이 표시된다.

2. **7개 질문 입력 (단일 페이지 스크롤 방식):**

   | 번호 | 질문 | 입력 방식 | 필수 여부 |
   |------|------|-----------|-----------|
   | Q1 | 주로 달리는 거리 | 라디오 (4개 옵션) | 필수 |
   | Q2 | 러닝 빈도 | 라디오 (3개 옵션) | 선택 (기본값: 주 3~4회) |
   | Q3 | 발볼 너비 | 라디오 (3개 옵션) | 필수 |
   | Q4 | 선호 쿠션감 | 슬라이더 (1~5단계) | 선택 (기본값: 3) |
   | Q5 | 중요 요소 | 체크박스 (최대 3개) | 선택 |
   | Q6 | 예산 범위 | 라디오 (5개 옵션) | 선택 |
   | Q7 | 추가 자유 서술 | 텍스트에어리어 (200자 이내) | 선택 |

3. **유효성 검증 및 제출:** "추천 받기" 버튼 클릭 시 필수 항목(Q1, Q3) 누락 여부를 검증한다. 오류가 있으면 에러 메시지를 노출하고 제출을 막는다. 통과 시 중복 제출을 방지하고 로딩 오버레이("AI가 최적의 러닝화를 찾고 있어요...")를 띄운다.

4. **데이터 전달:** 입력된 사용자 프로필을 `sessionStorage`에 JSON으로 저장한 뒤 `result.html`로 페이지 이동한다.

5. **결과 확인 (`result.html`):** 사용자 프로필 요약 태그(거리·발볼·쿠션·예산·우선순위)가 상단에 표시되고, 매칭 점수 기준 상위 최대 5개의 러닝화가 카드 형태로 노출된다. 각 카드에는 브랜드·모델명·매칭 점수(%)·추천 이유·주요 스펙 태그·가격·무신사 링크가 포함된다.

6. **TOP 비교:** 매칭 결과가 2개 이상일 경우 "TOP 1 vs TOP 2 비교" 버튼이 활성화되며, 모달 팝업으로 브랜드·쿠션·발볼·무게·통기성·착화감 등을 나란히 비교할 수 있다.

7. **예외 처리:**
   - 매칭 점수 30점 미만인 결과만 존재할 경우: "맞는 추천이 없습니다" empty-state UI와 조건 재조정 힌트를 제공한다.
   - 상품 데이터 로드 실패 시: 에러 메시지와 "다시 시도" 버튼을 표시한다.
   - `sessionStorage`에 프로필이 없을 경우: `index.html`로 자동 리다이렉트한다.

---

### 2. 타겟 단말 (Client)
* **디바이스:** 모바일 단말(스마트폰) 최우선 고려 (Mobile-First Design)
* **환경:** 모바일 웹 브라우저 (Safari, Chrome, Samsung Internet 등)
* **UI/UX 원칙:** 반응형 웹(Responsive Web)으로 구현하되, 터치 친화적인 큼직한 버튼과 스와이프 가능한 카드 UI를 적극 활용한다. (가로 스크롤 지양, 세로 스크롤 위주)

---

### 3. 기능 요구사항 (Functional Requirements)

#### 3.1. 사용자 입력 폼 (프론트엔드)

**입력 항목 상세 (Q1~Q7)**

| 질문 | name 속성 | 입력 타입 | 선택지 | 필수 | 기본값 |
|------|-----------|-----------|--------|------|--------|
| Q1. 달리는 거리 | `distance` | radio | short(5km↓) / medium(5~10km) / long(10~21km) / marathon(21km↑) | ✅ | 없음 |
| Q2. 러닝 빈도 | `frequency` | radio | casual(주1~2회) / regular(주3~4회) / intensive(주5회↑) | - | regular |
| Q3. 발볼 너비 | `width` | radio | wide(넓음) / normal(보통) / narrow(좁음) | ✅ | 없음 |
| Q4. 선호 쿠션감 | `cushion-slider` | range(1~5) | 1(매우 딱딱) ~ 5(매우 물렁) | - | 3(중간) |
| Q5. 중요 요소 | `priorities` | checkbox | speed / protection / comfort / breathability / design | - | 없음 |
| Q6. 예산 범위 | `budget` | radio | low(~7만) / mid(7~12만) / high(12~20만) / premium(20만↑) / 상관없음 | - | 상관없음 |
| Q7. 자유 서술 | `free-text` | textarea | 최대 200자 자유 입력 | - | 없음 |

**UI 인터랙션 규칙**

* **단일 페이지 스크롤:** Progressive Disclosure 방식이 아닌 7개 질문을 한 페이지에서 세로 스크롤로 노출한다. (PREMORTEM C1 대응 — 필수 항목을 Q1·Q3 두 개로 최소화하여 이탈률 억제)
* **카드 선택 피드백:** 라디오/체크박스 선택 시 해당 카드에 `selected` 클래스가 즉시 적용되어 시각적 선택 상태를 표시한다.
* **Q5 최대 3개 제한:** 체크박스 4번째 선택 시 마지막 항목이 자동 해제되고 토스트 경고("중요 요소는 최대 3개까지 선택 가능합니다.")가 2초 표시된다.
* **Q4 실시간 레이블:** 슬라이더 조작 시 값에 대응하는 한국어 레이블(매우 딱딱 / 약간 딱딱 / 중간 / 약간 물렁 / 매우 물렁)을 즉시 갱신한다.
* **Q7 글자수 카운팅:** 입력 중 실시간으로 `현재 글자수 / 200` 표시.

**반응형 레이아웃 (Responsive Design)**

모바일 퍼스트(Mobile-First) 원칙으로 설계하며, 3단계 브레이크포인트로 대응한다.

| 브레이크포인트 | 대상 기기 | 주요 레이아웃 변경 |
|---|---|---|
| `> 600px` (기본) | 태블릿·데스크탑 | 컨테이너 `max-width: 720px` 중앙 정렬, 그리드 최대 5열 |
| `≤ 600px` | 일반 스마트폰 | grid-4·grid-5 → 2열, 컨테이너 패딩 축소 |
| `≤ 480px` | 소형 스마트폰 | grid-3 → 2열, 헤더·질문카드 폰트 축소, 결과카드 세로 정렬, 액션버튼 전체폭 |
| `≤ 375px` | 초소형(iPhone SE 등) | 모든 그리드 2열 고정, 옵션 버튼 패딩 최소화 |

세부 규칙:
* **선택지 그리드:** 화면 너비에 따라 열 수를 자동 조정하여 터치 타겟이 최소 48px 이상 확보되도록 한다.
* **결과 카드:** `≤ 480px`에서 가로(flex-row) → 세로(flex-column) 레이아웃으로 전환하여 브랜드·모델명·매칭점수·추천 이유가 잘 보이도록 한다.
* **비교 모달 테이블:** `≤ 480px`에서 셀 패딩과 폰트를 줄이고, 속성 열 너비를 축소하여 모달 내 가로 스크롤 없이 표시한다.
* **액션 버튼:** `≤ 480px`에서 세로 배열 + 전체폭(100%)으로 전환하여 터치 조작 편의성을 높인다.

**유효성 검증 (Validation)**

* 제출 버튼 클릭 시 아래 규칙을 순서대로 검사한다:

  | 조건 | 에러 메시지 |
  |------|-------------|
  | Q1 미선택 | "Q1 '달리는 거리'를 선택해 주세요." |
  | Q3 미선택 | "Q3 '발볼 유형'을 선택해 주세요." |
  | Q5 4개 이상 선택 | "Q5 '중요 요소'는 최대 3개까지 선택 가능합니다." |
  | Q7 200자 초과 | "Q7 추가 내용은 200자 이내로 입력해 주세요." |

* 에러가 하나라도 있으면 제출을 막고, 에러 영역(`#errors`)을 노출한 뒤 해당 영역으로 부드럽게 스크롤한다.
* 중복 제출 방지: 제출 후 버튼을 `disabled` 처리하고 텍스트를 "진단 중.."으로 변경한다.

**로딩 상태**

* 유효성 통과 시 전체 화면 로딩 오버레이(`#loading-overlay`)가 표시되고 "AI가 최적의 러닝화를 찾고 있어요..." 문구가 노출된다.
* 사용자 프로필 JSON을 `sessionStorage`에 저장 후 800ms 뒤 `result.html`로 이동한다.

**수집되는 사용자 프로필 JSON 구조**

```json
{
  "running_distance": "medium",
  "frequency": "regular",
  "foot_width": "wide",
  "preferred_cushion": 3,
  "priorities": ["protection", "comfort"],
  "budget": "high",
  "free_text": "평발이에요"
}
```

#### 3.2. 추천 엔진 및 LLM 연동 (백엔드)
* **데이터 필터링 (1차):** 사용자가 입력한 조건(예산, 발볼, 내전 여부)을 바탕으로 Google Sheets(DB)에서 조건에 맞지 않는 신발을 1차로 필터링한다. (환각 방지 및 AI 토큰 절약)
* **Claude API 호출 (2차):** 필터링된 후보군 N개와 사용자 프로파일을 Claude API 프롬프트에 주입하여 최종 3개를 선정하고, **"자연어로 된 맞춤형 추천 사유"**를 생성한다.
* **타임아웃 및 폴백(Fallback) (PREMORTEM D1 리스크 대응):** API 응답이 10초 이상 지연될 경우 통신을 끊고, DB에 하드코딩된 '안정성 위주의 베스트셀러(예: 브룩스 아드레날린, 아식스 카야노 등)'를 폴백 데이터로 즉시 반환한다.

---

### 4. 시스템 구성도 (Architecture)

MVP 단계의 속도와 유지보수성을 고려하여, 복잡한 인프라 대신 서버리스(Serverless) 개념을 차용한 3-Tier 아키텍처로 구성합니다.

#### 구성 레이어

| 레이어 | 구성 요소 | 기술 스택 |
|---|---|---|
| **Client** | Mobile Web Browser | React / Vercel |
| **WAS** | Backend / API Server | Node.js Express |
| **WAS** | LLM 처리 로직 | Claude Logic |
| **WAS** | DB 연결 모듈 | Google Sheets API |
| **External** | LLM 서비스 | Anthropic Claude 3.5 Sonnet |
| **External** | 데이터베이스 | Google Sheets |

#### 데이터 흐름

| 순서 | 송신 | 수신 | 내용 |
|---|---|---|---|
| 1 | Mobile Web UI | Node.js API | 사용자 프로파일 전송 `POST /api/recommend` |
| 2 | Node.js API | Google Sheets API | 기초 데이터 조회 |
| 3 | Google Sheets API | Google Sheets | 러닝화 메타/리뷰 데이터 조회 (양방향) |
| 4 | Node.js API | Claude Logic | 프롬프트 + 후보군 전송 |
| 5 | Claude Logic | Claude API | 분석 및 사유 생성 (양방향) |
| 6 | Node.js API | Mobile Web UI | 최종 추천 결과 반환 (JSON) |

> **설계 의도 (Why):** 데이터베이스를 Google Sheets로 활용하여 기획/데이터 팀이 실시간으로 러닝화 스펙이나 리뷰 요약본을 직접 수정할 수 있게 하여 개발 의존도를 낮춥니다.

---

### 5. 기술 스택 (Tech Stack)

* **Frontend:**
  * **Framework:** React.js (Vite 기반)
  * **Styling:** Tailwind CSS (빠른 모바일 UI 컴포넌트 구성)
  * **State Management:** React Context API (단순한 스텝 폼 상태 관리)
* **Backend (WAS):**
  * **Framework:** Node.js + Express.js (가벼운 API 서버 구축)
  * **API Client:** Axios (외부 API 통신용)
* **Database & LLM:**
  * **DB:** Google Sheets + `google-spreadsheet` npm 패키지
  * **LLM:** Anthropic Claude API (모델: `claude-3-5-sonnet-20240620` - 추론 및 근거 생성에 탁월)

---

### 6. API 명세 (API Specifications)

**[POST] `/api/recommend`**
* **기능:** 사용자 데이터를 받아 최적의 러닝화 최대 5종과 추천 사유 반환
* **Request (Body):**
  ```json
  {
    "user_profile": {
      "running_distance": "short",
      "frequency": "regular",
      "foot_width": "wide",
      "preferred_cushion": 3,
      "priorities": ["protection", "comfort"],
      "budget": "high",
      "free_text": "평발이에요"
    }
  }
  ```

  | 필드명 | 타입 | 허용값 | 필수 | 설명 |
  |---|---|---|---|---|
  | `running_distance` | string | `short` / `medium` / `long` / `marathon` | ✅ | 주로 달리는 거리 |
  | `frequency` | string | `casual` / `regular` / `intensive` | - | 러닝 빈도 (기본값: `regular`) |
  | `foot_width` | string | `wide` / `normal` / `narrow` | ✅ | 발볼 너비 |
  | `preferred_cushion` | number | 1~5 정수 | - | 선호 쿠션감 (기본값: `3`) |
  | `priorities` | string[] | `speed` / `protection` / `comfort` / `breathability` / `design` (최대 3개) | - | 중요 요소 |
  | `budget` | string | `low` / `mid` / `high` / `premium` | - | 예산 범위 |
  | `free_text` | string | 최대 200자 | - | 자유 서술 |

* **Response (Success - 200 OK):**
  ```json
  {
    "status": "success",
    "recommendations": [
      {
        "rank": 1,
        "match_score": 85,
        "goods_no": "4112233",
        "goods_name": "젤 카야노 31",
        "brand": "아식스",
        "price": 189000,
        "url": "https://www.musinsa.com/products/4112233",
        "thumbnail": "https://...",
        "width": "보통",
        "cushion": 4,
        "weight": 4,
        "distance": "장거리",
        "breathability": 3,
        "fit": 5,
        "summary": "안정성 최고, 평발 러너에게 추천",
        "review_count_used": 20,
        "confidence": "high",
        "reason": "평발이신 점과 넓은 발볼을 고려할 때 안정성이 가장 뛰어난 선택입니다.",
        "is_fallback": false
      }
    ]
  }
  ```

  | 필드명 | 타입 | 설명 |
  |---|---|---|
  | `rank` | number | 추천 순위 (1~5) |
  | `match_score` | number | 매칭 점수 (0~100) |
  | `goods_no` | string | Google Sheets 상품 고유번호 (PK) |
  | `goods_name` | string | 모델명 |
  | `brand` | string | 브랜드명 |
  | `price` | number | 판매가 (원) |
  | `url` | string | 무신사 상품 링크 |
  | `thumbnail` | string | 상품 썸네일 이미지 URL |
  | `width` | string | 발볼 (`넓음` / `보통` / `좁음`) |
  | `cushion` | number | 쿠션감 1~5 |
  | `weight` | number | 무게감 1~5 |
  | `distance` | string | 적합 거리 (`단거리` / `중거리` / `장거리` / `전거리`) |
  | `breathability` | number | 통기성 1~5 |
  | `fit` | number | 착화감 1~5 |
  | `summary` | string | 리뷰 기반 한줄 요약 |
  | `review_count_used` | number | 분석에 사용된 리뷰 수 |
  | `confidence` | string | 데이터 신뢰도 (`high` / `medium` / `low`) |
  | `reason` | string | Claude AI가 생성한 맞춤형 추천 사유 |
  | `is_fallback` | boolean | Claude API 장애로 폴백 처리된 경우 `true` |

* **Response (No Match - 200 OK):** 매칭 점수 30점 미만인 결과만 존재하는 경우
  ```json
  {
    "status": "no_match",
    "message": "입력하신 조건에 맞는 러닝화가 없습니다. 예산 범위나 발볼 조건을 조정해 보세요.",
    "recommendations": []
  }
  ```

* **Response (Error - 4xx/5xx):** 서버 오류 또는 Claude API 장애 시
  ```json
  {
    "status": "error",
    "message": "오류 메시지"
  }
  ```

---

### 7. 데이터 구조 (Google Sheets 기반 DB & ERD)

Google Sheets를 DB로 사용하므로, 각 탭(Sheet)을 하나의 Table로 간주하여 평면화(Denormalization)된 구조를 가져갑니다.

#### ERD — 관계 정의

| 엔티티 | 관계 | 엔티티 | 설명 |
|---|---|---|---|
| `Logs` | 1 : N (논리적 참조) | `Shoes` | 하나의 로그에 여러 추천 신발 포함 가능 |

> Google Sheets 환경이므로 물리적 FK 제약조건은 없으나, 애플리케이션 레벨에서 `goods_no` 기준으로 논리적 조인을 수행함

---

#### Sheet 1: `Shoes` (러닝화 메타 데이터)

| Column Name | Type | Key | 허용값 | Description | Example |
|---|---|---|---|---|---|
| goods_no | String | PK | 무신사 상품번호 | 고유 식별자 | `5005842` |
| goods_name | String | | | 모델명 | `맥시마이저 26` |
| brand | String | | | 브랜드명 | `미즈노` |
| price | Number | | 정수 | 판매가 (원) | `59000` |
| url | String | | URL | 무신사 상품 링크 | `https://www.musinsa.com/products/5005842` |
| thumbnail | String | | URL | 상품 썸네일 이미지 URL | `` |
| width | String | | `넓음` / `보통` / `좁음` | 발볼 너비 | `보통` |
| cushion | Number | | 1~5 정수 | 쿠션감 (1=딱딱, 5=물렁) | `4` |
| weight | Number | | 1~5 정수 | 무게감 (1=가벼움, 5=무거움) | `2` |
| distance | String | | `단거리` / `중거리` / `장거리` / `전거리` | 적합 러닝 거리 | `중거리` |
| breathability | Number | | 1~5 정수 | 통기성 | `4` |
| fit | Number | | 1~5 정수 | 착화감 | `5` |
| summary | String | | | 리뷰 기반 한줄 요약 | `가성비 좋은 데일리 러닝화, 쿠션감 우수` |
| review_count_used | Number | | 정수 | 분석에 사용된 리뷰 수 | `20` |
| confidence | String | | `high` / `medium` / `low` | 데이터 신뢰도 | `high` |

##### Shoes 초기 샘플 데이터 (10개)

| goods_no | goods_name | brand | price | width | cushion | weight | distance | breathability | fit | summary | review_count_used | confidence |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 5005842 | 맥시마이저 26 (오프 화이트) | 미즈노 | 59000 | 보통 | 4 | 2 | 중거리 | 4 | 5 | 가성비 좋은 데일리 러닝화, 쿠션감 우수 | 20 | high |
| 3990544 | W480SK5 | 뉴발란스 | 75000 | 보통 | 3 | 2 | 단거리 | 4 | 4 | 가벼운 입문용 러닝화 | 20 | high |
| 4521387 | 페가수스 41 | 나이키 | 159000 | 보통 | 4 | 3 | 전거리 | 4 | 4 | 범용 데일리 트레이너, 안정적 쿠션 | 20 | high |
| 5123456 | 마파테 스피드 2 | 호카 | 239000 | 넓음 | 5 | 3 | 장거리 | 3 | 5 | 구름 같은 쿠션, 마라톤·장거리 최적 | 18 | high |
| 4789123 | 엔돌핀 스피드 4 | 사코니 | 199000 | 보통 | 3 | 1 | 중거리 | 5 | 4 | 초경량 반발력 카본 플레이트 | 15 | high |
| 4456789 | 노바블라스트 4 | 아식스 | 149000 | 넓음 | 5 | 3 | 장거리 | 3 | 4 | 푹신한 쿠션, 장거리 부상 방지 | 20 | high |
| 4112233 | 젤 카야노 31 | 아식스 | 189000 | 보통 | 4 | 4 | 장거리 | 3 | 5 | 안정성 최고, 평발 러너에게 추천 | 20 | high |
| 5234567 | 클리프턴 9 | 호카 | 169000 | 넓음 | 5 | 2 | 전거리 | 4 | 5 | 가벼우면서 푹신, 발볼 넓은 분께 | 20 | high |
| 4998877 | 라이드 17 | 사코니 | 139000 | 좁음 | 3 | 2 | 중거리 | 4 | 3 | 발볼 좁은 분께 적합, 균형형 | 12 | high |
| 4665544 | 글라이드라이드 3 | 아식스 | 129000 | 보통 | 4 | 4 | 장거리 | 3 | 4 | 에너지 세이빙 장거리 트레이너 | 8 | medium |

---

#### Sheet 2: `Logs` (사용자 이용 이력)

| Column Name | Type | Key | 허용값 | Description | Example |
|---|---|---|---|---|---|
| log_id | String | PK | UUID | 이력 고유 ID (자동생성) | `550e8400-e29b-41d4-a716` |
| timestamp | DateTime | | `YYYY-MM-DD HH:mm:ss` | 조회 일시 | `2026-05-03 14:00:00` |
| running_distance | String | | `short` / `medium` / `long` / `marathon` | 달리는 거리 | `medium` |
| frequency | String | | `casual` / `regular` / `intensive` | 러닝 빈도 | `regular` |
| foot_width | String | | `wide` / `normal` / `narrow` | 발볼 너비 | `normal` |
| preferred_cushion | Number | | 1~5 정수 | 선호 쿠션감 | `3` |
| priorities | String | | 콤마 구분 | 중요 요소 | `protection,comfort` |
| budget | String | | `low` / `mid` / `high` / `premium` | 예산 범위 | `high` |
| free_text | String | | 최대 200자 | 자유 서술 내용 | `평발이에요` |
| recommended_goods_no | String | FK→Shoes | 콤마 구분 | 추천된 goods_no 목록 | `4112233,5234567,4456789` |

---

### 8. 서비스 흐름도 (Call Flow)

사용자가 추천 버튼을 누른 후 화면에 결과가 뜨기까지의 백엔드 내부 로직 흐름입니다.

#### 정상 흐름

| 단계 | 주체 | 대상 | 액션 | 비고 |
|---|---|---|---|---|
| 1 | User | Mobile Web UI | 프로파일 입력 및 추천 요청 | |
| 2 | Mobile Web UI | Mobile Web UI | 입력값 유효성 검사 (Validation) | 클라이언트 내부 처리 |
| 3 | Mobile Web UI | Node.js API | `POST /api/recommend` 전송 | 로딩 UI 활성화 |
| 4 | Node.js API | Google Sheets | 전체 러닝화 메타 데이터 조회 (Sheet: Shoes) | |
| 5 | Google Sheets | Node.js API | 데이터 반환 (JSON array) | |
| 6 | Node.js API | Node.js API | 1차 필터링 로직 실행 (예산, 발볼, 내전 여부 매칭) | 내부 처리 |
| 7 | Node.js API | Claude 3.5 API | 필터링된 후보군 + 사용자 프로파일 전송 (Prompt) | System Prompt: MANIFESTO 원칙 적용 (부상 방지 우선) |
| 8 | Claude 3.5 API | Node.js API | 최종 3개 선정 및 맞춤형 사유(Reason) 응답 | |
| 9 | Node.js API | Google Sheets | 로그 저장 (Sheet: Logs) | **비동기 처리** |
| 10 | Node.js API | Mobile Web UI | 최종 결과 반환 | |
| 11 | Mobile Web UI | User | 추천 결과 카드 UI 렌더링 | 로딩 종료 |

#### Fallback 처리 (API 장애 또는 시간 초과 시)

| 조건 | 처리 주체 | 액션 |
|---|---|---|
| Claude API Timeout 발생 | Node.js API | Fallback 로직 가동 — 하드코딩된 안전한 추천 리스트 즉시 로드 후 반환 |

---

## Part 2. 신규 기능 명세 (v2.0)

> 기존 MVP(Part 1) 기능은 유지하며, 아래 7개 신규 기능을 단계적으로 추가한다.
> 구현 우선순위는 각 기능 항목 내 명시된 순위를 따른다.

---

### 9. 홈 화면 재설계 (Home Screen Redesign)

#### 9.1. 화면 구조

기존 단일 설문 폼 진입 방식에서 서비스 허브 구조로 전환한다.

**레이아웃 (Option B: 핵심 CTA + 보조 서비스)**

```
┌─────────────────────────┐
│  🏃 RunFit              │
│  달리는 사람의 편에서    │
│  데이터가 말하게         │
│                         │
│  ┌───────────────────┐  │
│  │  내 러닝화 추천받기 → │  │  ← Primary CTA (전체폭)
│  └───────────────────┘  │
├─────────────────────────┤
│  다른 서비스             │
│  ┌──────┐┌──────┐┌────┐ │
│  │교체   ││대회   ││셀럽/ │ │  ← 보조 서비스 카드
│  │계산기 ││코스   ││우승자│ │
│  └──────┘└──────┘└────┘ │
└─────────────────────────┘
```

#### 9.2. 재방문자 개인화 (localStorage 활용)

| 상태 | 홈 화면 CTA |
|---|---|
| 첫 방문 | "내 러닝화 추천받기 →" (기존 Q1~Q7 플로우) |
| 재방문 (이전 추천 이력 있음) | "지난번 추천: [모델명] — 교체 시기 확인하기" + "다시 추천받기" 보조 버튼 |

- 이전 추천 결과(`goods_no`, `goods_name`, `recommend_date`)를 `localStorage`에 저장
- 재방문 시 감지하여 개인화 CTA로 교체
- 별도 로그인 없이 구현 가능

---

### 10. Feature 1 — 셀럽 / 러닝 인플루언서 착용 신발 추천

**구현 우선순위:** 3순위

#### 10.1. 기능 개요

연예인·운동선수·유튜버 등 셀럽이 실제 착용한 신발을 탐색하는 별도 진입 경로.
홈 화면 보조 서비스 카드 "셀럽/우승자" 탭에서 진입한다.

#### 10.2. DB 변경 — 신규 시트 `Celebs`

| 컬럼명 | 타입 | Key | 설명 | 예시 |
|---|---|---|---|---|
| `celeb_id` | String | PK | 고유 식별자 | `celeb_001` |
| `celeb_name` | String | | 셀럽 이름 | `기성용` |
| `celeb_type` | String | | `actor` / `athlete` / `influencer` / `youtuber` | `athlete` |
| `celeb_image_url` | String | | 셀럽 이미지 URL | `https://...` |
| `goods_no` | String | FK→Shoes | 착용 신발 고유번호 | `4112233` |
| `source_url` | String | | 근거 기사·인스타 링크 | `https://...` |

> **설계 의도:** Shoes 시트에 컬럼 추가 대신 별도 시트로 분리한 이유 — 셀럽 1명이 여러 신발 착용, 신발 1개를 여러 셀럽이 착용하는 M:N 관계이므로 단일 컬럼으로 관리 시 쉼표 구분 문자열로 처리해야 하며 조회·수정이 복잡해진다.

#### 10.3. API 명세

| 메서드 | 엔드포인트 | 기능 |
|---|---|---|
| `GET` | `/api/celebs` | 셀럽 목록 반환 (`celeb_type` 필터 지원) |
| `GET` | `/api/celebs/:celeb_id` | 해당 셀럽 착용 신발 목록 반환 |

#### 10.4. UI 흐름

홈 화면 "셀럽/우승자" 카드 → 셀럽 탭 선택 → 셀럽 카드 목록(이미지·이름·유형) → 셀럽 선택 → 착용 신발 카드 (기존 결과 카드 컴포넌트 재사용)

---

### 11. Feature 2 — 신발에 어울리는 양말 색상 추천

**구현 우선순위:** 4순위

#### 11.1. 기능 개요

신발 추천 결과 이후 Claude API가 색상 이론 기반으로 어울리는 양말 색상 3가지를 추천한다.
기존 추천 결과 카드의 확장 UI로 제공한다.

#### 11.2. DB 변경 — `Shoes` 시트 컬럼 추가

| 컬럼명 | 타입 | 설명 | 예시 |
|---|---|---|---|
| `main_color` | String | 신발 주조색 (한국어) | `흰색` |
| `accent_color` | String | 포인트 색상 | `형광 그린` |

#### 11.3. API 명세

**[POST] `/api/recommend/socks`**

| 항목 | 내용 |
|---|---|
| Input | `goods_no`, `main_color`, `accent_color` |
| Output | 양말 색상 3가지: `color_name`, `hex_code`, `reason` |
| LLM | Claude API 사용 (색상 이론 기반 조합 생성) |

#### 11.4. UI

추천 결과 카드 하단 "어울리는 양말 색상" 섹션 — 색상 원(Circle) + 색상명 + 추천 이유 텍스트

---

### 12. Feature 3 — 상하의·모자 코디 추천 + 가상 코디 시각화

**구현 우선순위:** 5순위 (Phase A) / 6순위 (Phase B)

#### 12.1. 기능 개요

신발·양말 색상 결정 후 상의·하의·모자 색상 추천 및 SVG 기반 가상 코디 시각화.
Feature 2 완료 후 자연스러운 확장으로 구현한다.

#### 12.2. DB 변경

없음. Feature 2에서 추가된 색상 데이터(`main_color`, `accent_color`)와 Claude API를 활용한다.

#### 12.3. API 명세

**[POST] `/api/recommend/outfit`**

| 항목 | 내용 |
|---|---|
| Input | `goods_no`, `main_color`, `accent_color`, `sock_color` |
| Output | 상의·하의·모자 추천 색상 각 2~3가지: `item`, `color_name`, `hex_code`, `reason` |

#### 12.4. 구현 2단계

| Phase | 내용 | 난이도 | 외부 비용 |
|---|---|---|---|
| A (단기) | 색상 팔레트 추천 — 색상 칩 + 색상명 + 이유 텍스트 | 낮음 | 없음 |
| B (중기) | 미리 제작된 러닝 아웃핏 SVG 템플릿에 `hex_code` 동적 적용 | 중간 | 없음 |

> **설계 의도:** AI 이미지 생성(DALL-E 등)은 API 비용 발생 및 응답 속도 문제로 채택하지 않는다. SVG 템플릿 방식으로 추가 비용 없이 구현한다.

#### 12.5. UI 흐름

양말 색상 확인 → "전체 코디 보기" 버튼 → 코디 색상 팔레트 카드 → (Phase B) SVG 아바타 시각화

---

### 13. Feature 4 — 마라톤 대회 우승자 착용 신발 추천

**구현 우선순위:** 2순위

#### 13.1. 기능 개요

국내외 주요 마라톤 대회 우승자가 착용한 신발 데이터를 기반으로 탐색 및 추천.
홈 화면 보조 서비스 카드 "셀럽/우승자" 탭에서 Feature 1(셀럽)과 탭 분리로 제공한다.

#### 13.2. DB 변경 — 신규 시트 `RaceWinners`

| 컬럼명 | 타입 | Key | 설명 | 예시 |
|---|---|---|---|---|
| `winner_id` | String | PK | 고유 식별자 | `winner_001` |
| `race_name` | String | | 대회명 | `베를린 마라톤` |
| `race_year` | Number | | 개최 연도 | `2024` |
| `winner_name` | String | | 우승자 이름 | `Eliud Kipchoge` |
| `winner_nationality` | String | | 국적 | `케냐` |
| `course_type` | String | | `half` / `full` | `full` |
| `result_time` | String | | 기록 | `2:00:35` |
| `goods_no` | String | FK→Shoes | 착용 신발 고유번호 | `4112233` |
| `source_url` | String | | 근거 기사 링크 | `https://...` |

#### 13.3. API 명세

| 메서드 | 엔드포인트 | 기능 |
|---|---|---|
| `GET` | `/api/race-winners` | 우승자 목록 반환 (`race_name`, `race_year`, `course_type` 필터 지원) |

#### 13.4. UI 흐름

"셀럽/우승자" 카드 → 우승자 탭 선택 → 대회명·연도 필터 → 우승자 카드(이름·기록·국적) + 착용 신발 카드

---

### 14. Feature 5 — 대회 코스 기반 러닝화 추천

**구현 우선순위:** 1순위

#### 14.1. 기능 개요

출전 예정 대회와 코스 유형(하프/풀)을 선택하면 코스 특징을 분석하고 최적 러닝화를 추천한다.
기존 Q1~Q7 흐름과 독립된 새로운 진입 경로로 제공한다.

#### 14.2. 대상 대회

| 구분 | 대회명 | 도시 | 개최월 | 코스 핵심 특징 |
|---|---|---|---|---|
| 세계 7대 | 도쿄 마라톤 | 도쿄 | 3월 | 도심 평탄, 저온, 세계기록급 고속 |
| 세계 7대 | 보스턴 마라톤 | 보스턴 | 4월 | 전반 내리막 → 후반 Heartbreak Hill, 고난도 |
| 세계 7대 | 런던 마라톤 | 런던 | 4월 | 템즈강변 평탄, 서늘한 날씨 |
| 세계 7대 | 베를린 마라톤 | 베를린 | 9월 | 세계 최고속 코스, 초평탄, 세계기록 최다 배출 |
| 세계 7대 | 시카고 마라톤 | 시카고 | 10월 | 도심 루프형 평탄, 강풍 변수 |
| 세계 7대 | 뉴욕 마라톤 | 뉴욕 | 11월 | 다리 5개 통과, 고저차 있음, 고난도 |
| 세계 7대 | 시드니 마라톤 | 시드니 | 9월 | 오페라하우스 피니시, 지속적인 오르막과 내리막, 고난도 |
| 국내 | 동아 서울 마라톤 | 서울 | 3월 | 광화문~잠실, 도심 평탄, 국내 최고 권위 및 기록 산실 |
| 국내 | JTBC 서울 마라톤 | 서울 | 11월 | 상암~잠실, 전반 평탄 후반 완만한 오르막, 한강변 및 잠실교 통과 |
| 국내 | 춘천 마라톤 | 강원 춘천 | 10월 | 의암호 순환, 가을 서늘한 기온, 잔잔한 업다운이 반복되는 롤링 코스 |
| 국내 | 경주 마라톤 | 경북 경주 | 10월 | 유적지 순환, 완만한 기복, 일부 구간 노면 불규칙 및 직선 주로 위주 |
| 국내 | 대구 마라톤 | 대구 | 3~4월 | 도심 루프형 코스, 대체로 평탄하나 분지 특유의 높은 기온이 변수 |
| 국내 | 공주 백제 마라톤 | 충남 공주 | 9월 | 금강변 국도 주로, 고저차가 거의 없는 초평탄 코스 |
| 국내 | 군산 새만금 국제 마라톤 | 전북 군산 | 4월 | 새만금 방조제 직진 코스, 평탄하나 바다 한가운데의 강력한 맞바람 주의 |
| 국내 | 인천 송도 국제 마라톤 | 인천 | 10월 | 송도 도심 및 해안도로, 직선 위주의 단조로운 코스와 해풍 영향 |
| 국내 | 부산 바다 마라톤 | 부산 | 10월 | 광안대교 등 해상 교량 위주, 지속적인 오르막/내리막과 강한 바닷바람 |
| 국내 | 제주 감귤 국제 마라톤 | 제주 | 11월 | 해안 및 중산간 도로, 기복이 심하며 제주 특유의 돌풍과 기상 변화 심함 |
| 국내 | 철원 DMZ 평화 마라톤 | 강원 철원 | 9월 | 민통선 내부 통과, 탁 트인 벌판 지대로 고저차는 적으나 그늘이 없음 |
| 국내 | 밀양 아리랑 마라톤 | 경남 밀양 | 2월 | 시즌 오픈 대회, 초봄 쌀쌀한 날씨, 국도 중심의 평탄한 코스 |
| 국내 | 합천 벚꽃 마라톤 | 경남 합천 | 4월 | 황강변 벚꽃길 주로, 풍광은 좋으나 미세한 업다운이 지속됨 |
| 국내 | 진주 남강 마라톤 | 경남 진주 | 3월 | 남강변 순환, 기복이 적어 기록 달성에 유리하며 쾌적한 봄 기후 |
| 국내 | 순천 남승룡 마라톤 | 전남 순천 | 11월 | 순천만 습지 인근 주로, 평탄하지만 일부 구간 코스 폭이 좁음 |
| 국내 | 고성 공룡 마라톤 | 경남 고성 | 4월 | 해안도로 중심, 굴곡진 해안선에 따른 고저차와 바닷바람 영향 |
| 국내 | 청주 대청호 마라톤 | 충북 청주 | 9월 | 대청호반 순환, 지속적인 급경사와 내리막이 반복되는 최고 난이도 코스 |
| 국내 | 포항 해변 마라톤 | 경북 포항 | 4~5월 | 영일대 해안도로 중심, 평탄하나 기온 상승과 맞바람이 주요 변수 |
| 국내 | 여수 마라톤 | 전남 여수 | 1월 | 한겨울 시즌 오픈 대회, 강한 해풍과 교량 통과 언덕이 많은 고난도 |
| 국내 | 서울 하프 마라톤 | 서울 | 4월 | 광화문~상암, 도심 주요 구간 통제, 넓은 도로와 쾌적한 평탄 위주 |
| 국내 | 보성 녹차 마라톤 | 전남 보성 | 5월 | 메타세쿼이아 길 통과, 5월의 높은 기온과 잦은 언덕 구간 존재 |
| 국내 | 수원 화성 마라톤 | 경기 수원 | 4월 | 화성행궁 및 외곽 도로, 완만한 구릉지가 섞인 전형적인 도심/국도 코스 |
| 국내 | 정읍 내장산 단풍 마라톤 | 전북 정읍 | 10월 | 내장산 인근 주로, 산악 지대 인접으로 고저차가 뚜렷한 후반부 주의 |
| 국내 | 양평 남한강 마라톤 | 경기 양평 | 6월 | 남한강변 자전거길 및 국도, 6월 초여름의 높은 습도와 더위가 최대 관건 |
| 국내 | 파주 평화 마라톤 | 경기 파주 | 10월 | 임진각 및 통일대교 통과, 도로가 넓고 평탄하여 가을철 기록 단축에 용이 |

#### 14.3. DB 변경 — 신규 시트 `Races`

| 컬럼명 | 타입 | Key | 설명 | 예시 |
|---|---|---|---|---|
| `race_id` | String | PK | 고유 식별자 | `jtbc_half` |
| `race_name` | String | | 대회명 | `JTBC 서울 마라톤` |
| `country` | String | | 국가 코드 | `KR` |
| `city` | String | | 도시 | `서울` |
| `course_type` | String | | `half` / `full` | `half` |
| `typical_month` | Number | | 통상 개최월 | `11` |
| `avg_temp_celsius` | Number | | 대회 시즌 평균 기온 | `12` |
| `surface_type` | String | | `asphalt` / `mixed` / `trail` | `asphalt` |
| `elevation_gain_m` | Number | | 누적 고도 상승 (m) | `85` |
| `difficulty` | Number | | 코스 난이도 1~5 | `2` |
| `course_summary` | String | | 코스 핵심 특징 요약 | `도심 평탄, 후반 완만 오르막, 한강변 포함` |
| `shoe_priority_hint` | String | | 추천 시 우선 고려 키워드 | `쿠션, 안정성, 경량` |
| `is_world_major` | Boolean | | 세계 6대 여부 | `false` |
| `is_active` | Boolean | | 대회 활성화 여부 (취소·폐지 대응) | `true` |

#### 14.4. API 명세

| 메서드 | 엔드포인트 | 기능 |
|---|---|---|
| `GET` | `/api/races` | 대회 목록 반환 (`country`, `is_world_major`, `course_type` 필터 지원) |
| `POST` | `/api/recommend/race` | 코스 기반 러닝화 추천 |

**[POST] `/api/recommend/race` Request:**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `race_id` | String | ✅ | 선택한 대회 ID |
| `course_type` | String | ✅ | `half` / `full` |
| `user_profile` | Object | - | Q1~Q7 사용자 프로필 (선택 — 개인화 강화 시 포함) |

**[POST] `/api/recommend/race` Response:**

```json
{
  "status": "success",
  "race": {
    "race_name": "JTBC 서울 마라톤",
    "course_type": "half",
    "course_summary": "도심 평탄, 후반 완만 오르막, 한강변 포함",
    "difficulty": 2,
    "avg_temp_celsius": 12,
    "surface_type": "asphalt",
    "elevation_gain_m": 85
  },
  "recommendations": [...]
}
```

#### 14.5. UI 흐름

홈 화면 "대회 코스" 보조 카드 → 국내/세계 탭 분리 → 대회 선택 → 하프/풀 선택 (필수) → 코스 특징 카드(기온·난이도·노면·고도·요약) → 추천 신발 카드 3개 → "내 발 조건도 함께 반영" 토글 (Q1~Q7 결합 선택)

---

### 15. Feature B — 러닝화 교체 시기 계산기

**구현 우선순위:** 2순위 (Feature 4와 병행 가능)

#### 15.1. 기능 개요

현재 신고 있는 러닝화의 구매 시점과 누적 주행 거리를 입력하면 교체 필요 여부와 예상 교체 시기를 알려준다.
재방문 유도의 핵심 기능으로, 홈 화면 보조 서비스 카드 "교체 계산기"에서 진입한다.

#### 15.2. DB 변경 — `Shoes` 시트 컬럼 추가

| 컬럼명 | 타입 | 설명 | 예시 |
|---|---|---|---|
| `lifespan_km_min` | Number | 최소 권장 수명 (km) | `500` |
| `lifespan_km_max` | Number | 최대 권장 수명 (km) | `800` |
| `has_carbon_plate` | Boolean | 카본 플레이트 여부 (수명 단축 요인) | `false` |

> 카본 플레이트 신발은 수명이 300~500km로 일반 쿠션화(500~800km)보다 짧다. `has_carbon_plate` 컬럼으로 구분하지 않으면 계산 결과가 부정확해진다.

#### 15.3. 입력 항목

| 항목 | 입력 방식 | 필수 |
|---|---|---|
| 신발 브랜드 + 모델명 | Shoes DB 자동완성 드롭다운 | ✅ |
| 구매 시점 | 연·월 선택 (월 단위) | ✅ |
| 누적 주행 거리 입력 방식 선택 | 라디오 (A/B 중 선택) | ✅ |
| Option A: 주간 평균 거리 (km) | 숫자 입력 → 시스템이 총 누적 계산 | - |
| Option B: 총 누적 거리 직접 입력 (km) | 숫자 입력 | - |

#### 15.4. 상태 판정 기준

| 사용률 | 상태 | 사용자 메시지 |
|---|---|---|
| ~50% | 양호 | "아직 충분히 쓸 수 있어요. 약 OOkm 남았습니다." |
| 50~80% | 주의 | "슬슬 교체를 고려할 시기입니다. 다음 대회 전 점검하세요." |
| 80~100% | 교체 권장 | "쿠션 성능이 저하되었을 수 있습니다. 교체를 권장합니다." |
| 100% 초과 | 교체 필요 | "부상 위험 구간입니다. 즉시 교체를 권장합니다." |

#### 15.5. API 명세

**[POST] `/api/shoes/lifespan`**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `goods_no` | String | ✅ | 신발 고유번호 |
| `purchase_year_month` | String | ✅ | 구매 시점 (`YYYY-MM`) |
| `weekly_km` | Number | - | Option A: 주간 평균 거리 |
| `total_km` | Number | - | Option B: 총 누적 거리 |

> LLM 불필요 — 순수 계산 로직으로 구현

#### 15.6. 재방문 유도 포인트

- 결과 하단 "OO개월 후 교체 예정" 문구 노출
- 교체 시기가 출전 예정 대회 일정과 겹칠 경우 경고 메시지 표시
- 교체 필요 판정 시 "지금 바로 추천받기 →" 버튼으로 Q1~Q7 플로우 연결
- 입력 결과를 `localStorage`에 저장 → 홈 화면 재방문 시 개인화 CTA 표시에 활용

---

### 16. Feature D — 사이즈 핏 가이드

**구현 우선순위:** 4순위 (Feature 2와 병행 가능)

#### 16.1. 기능 개요

"아식스 노바 블라스트 260mm를 신는데 뉴발란스 퓨어셀은 몇 mm를 사야 하나요?"처럼
브랜드 간 사이즈 편차를 반영하여 최적 사이즈를 추천한다.

#### 16.2. 브랜드별 사이즈 편차 특성

| 브랜드 | 사이즈 경향 | 발볼 경향 | 특이사항 |
|---|---|---|---|
| 아식스 | 표준 (기준) | 약간 좁음 | 한국인 발형 기준에 가까움 |
| 뉴발란스 | 표준~약간 큼 | 넓음 | 와이드 옵션 많음 |
| 나이키 | 약간 작음 | 좁음 | 0.5사이즈 업 권장 |
| 호카 | 약간 큼 | 넓음 | 내부 공간 여유 있음 |
| 사코니 | 표준 | 보통 | 모델별 편차 있음 |
| 미즈노 | 표준 | 보통 | 한국인 발형 잘 맞음 |

#### 16.3. DB 변경 — 신규 시트 `SizeGuide`

| 컬럼명 | 타입 | Key | 설명 | 예시 |
|---|---|---|---|---|
| `size_guide_id` | String | PK | 고유 식별자 | `sg_001` |
| `brand` | String | | 브랜드명 | `뉴발란스` |
| `model_name` | String | | 모델명 | `퓨어셀 슈퍼컴프 엘리트 v4` |
| `sizing_tendency` | String | | `small` / `true` / `large` | `true` |
| `width_tendency` | String | | `narrow` / `normal` / `wide` | `wide` |
| `size_adjust_mm` | Number | | 아식스 기준 대비 조정값 (mm, 음수 가능) | `+5` |
| `fit_note` | String | | 핏 관련 특이사항 | `발볼 넓은 분께 적합, 앞코 공간 여유` |

#### 16.4. API 명세

**[POST] `/api/size/convert`**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `from_brand` | String | ✅ | 현재 신고 있는 브랜드 |
| `from_model` | String | ✅ | 현재 모델명 |
| `from_size_mm` | Number | ✅ | 현재 착용 사이즈 (mm) |
| `to_brand` | String | ✅ | 변환하고 싶은 브랜드 |
| `to_model` | String | ✅ | 변환하고 싶은 모델명 |

**Response 예시:**
```json
{
  "status": "success",
  "recommended_size_mm": 255,
  "confidence": "high",
  "fit_note": "퓨어셀은 내부 공간이 여유롭게 설계되어 5mm 작은 사이즈가 더 잘 맞을 수 있습니다.",
  "width_note": "발볼이 넓은 편이므로 잘 맞을 것으로 예상됩니다."
}
```

> LLM 선택적 사용 — 기본 변환은 `size_adjust_mm` 계산 로직으로 처리하고, `fit_note` 코멘트 생성 시에만 Claude API 선택적 활용 가능

#### 16.5. UI 흐름

홈 화면 또는 추천 결과 하단 "사이즈 변환" 링크 → 현재 신발(브랜드·모델·사이즈) 입력 → 비교할 신발(브랜드·모델) 선택 → 추천 사이즈 + 핏 설명 + 발볼 주의사항 출력

---

### 17. 신규 기능 전체 DB 변경 요약

| 변경 대상 | 변경 유형 | 추가 항목 | 관련 기능 |
|---|---|---|---|
| `Shoes` 시트 | 컬럼 추가 | `main_color`, `accent_color`, `lifespan_km_min`, `lifespan_km_max`, `has_carbon_plate` | Feature 2, 3, B |
| `Celebs` 시트 | 신규 생성 | 6개 컬럼 | Feature 1 |
| `RaceWinners` 시트 | 신규 생성 | 9개 컬럼 | Feature 4 |
| `Races` 시트 | 신규 생성 | 14개 컬럼 | Feature 5 |
| `SizeGuide` 시트 | 신규 생성 | 7개 컬럼 | Feature D |

### 18. 신규 기능 전체 API 추가 요약

| 메서드 | 엔드포인트 | 관련 기능 |
|---|---|---|
| `GET` | `/api/celebs` | Feature 1 |
| `GET` | `/api/celebs/:celeb_id` | Feature 1 |
| `GET` | `/api/race-winners` | Feature 4 |
| `GET` | `/api/races` | Feature 5 |
| `POST` | `/api/recommend/race` | Feature 5 |
| `POST` | `/api/recommend/socks` | Feature 2 |
| `POST` | `/api/recommend/outfit` | Feature 3 |
| `POST` | `/api/shoes/lifespan` | Feature B |
| `POST` | `/api/size/convert` | Feature D |

### 19. 구현 우선순위 로드맵

| 순위 | 기능 | 이유 |
|---|---|---|
| 1 | Feature 5 (대회 코스 추천) | 독립 기능, DB 1개 추가, 차별화 가치 최고 |
| 2 | Feature 4 (우승자 신발) + Feature B (교체 계산기) | DB 추가 + UI 완성, 병행 구현 가능 |
| 3 | Feature 1 (셀럽 신발) | Feature 4와 동일 패턴, 콘텐츠 확보가 관건 |
| 4 | Feature 2 (양말 색상) + Feature D (사이즈 가이드) | Shoes 컬럼 추가 + API 확장, 병행 가능 |
| 5 | Feature 3-A (코디 색상) | Feature 2 완료 후 Claude 연동 확장 |
| 6 | Feature 3-B (SVG 시각화) | 프론트 공수 가장 큼, 별도 스프린트 필요 |