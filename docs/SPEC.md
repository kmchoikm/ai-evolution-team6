# SPEC.md
## SoleMate — 상세 기능 및 기술 명세서

이 문서는 SoleMate 서비스의 MVP(Minimum Viable Product) 구현을 위한 상세 개발 스펙을 정의합니다. 모든 코드 작성 및 시스템 설계는 이 문서를 기준으로 진행됩니다.

---

### 1. 사용자 시나리오 (User Scenario)
> **목적:** 사용자가 서비스에 진입하여 결과를 얻기까지의 핵심 흐름 정의 (이탈률 최소화 관점)

1. **진입 및 온보딩:** 사용자가 모바일 웹에 접속하면, 서비스의 핵심 가치("데이터 기반 부상 방지 러닝화 추천")가 1줄로 노출된다.
2. **Step 1. 신체 조건 입력:** 직관적인 UI(이미지/카드 선택형)를 통해 성별, 체중, 발볼, 아치 형태(내전/외전/중립)를 선택한다. (모를 경우 '잘 모름/중립' 선택 가능)
3. **Step 2. 러닝 목표 입력:** 주간 러닝 거리, 목표 대회(예: 서울마라톤), 예산을 선택한다.
4. **분석 대기 (Loading):** 입력 완료 버튼을 누르면 "수천 건의 리뷰 데이터를 분석하여 최적의 러닝화를 찾고 있습니다..."라는 문구와 함께 로딩 스피너가 표시된다.
5. **결과 확인:** AI가 분석한 1, 2, 3순위 러닝화가 카드 형태로 노출된다. 각 카드에는 추천 이유(사용자 데이터 기반)와 주요 스펙, 예상 가격이 명시된다.

---

### 2. 타겟 단말 (Client)
* **디바이스:** 모바일 단말(스마트폰) 최우선 고려 (Mobile-First Design)
* **환경:** 모바일 웹 브라우저 (Safari, Chrome, Samsung Internet 등)
* **UI/UX 원칙:** 반응형 웹(Responsive Web)으로 구현하되, 터치 친화적인 큼직한 버튼과 스와이프 가능한 카드 UI를 적극 활용한다. (가로 스크롤 지양, 세로 스크롤 위주)

---

### 3. 기능 요구사항 (Functional Requirements)

#### 3.1. 사용자 입력 폼 (프론트엔드)
* **Progressive Disclosure (점진적 공개):** 한 화면에 모든 질문을 쏟아내지 않고, 1~2개씩 스텝별로 나누어 보여주어 입력 피로도를 낮춘다. (PREMORTEM C1 리스크 대응)
* **입력값 검증 (Validation):** 필수 값 누락 시 다음 스텝으로 넘어가지 못하게 막고, 붉은색 테두리와 직관적인 에러 메시지를 띄운다.

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
* **기능:** 사용자 데이터를 받아 최적의 러닝화 3종과 추천 사유 반환
* **Request (Body):**
  ```json
  {
    "user_profile": {
      "gender": "male",
      "weight_kg": 75,
      "foot_type": "overpronation",
      "foot_width": "wide",
      "budget_max": 200000,
      "target_race": "seoul_marathon"
    }
  }
  ```
* **Response (Success - 200 OK):**
  ```json
  {
    "status": "success",
    "recommendations": [
      {
        "rank": 1,
        "brand": "Asics",
        "model": "Gel-Kayano 30",
        "price": 189000,
        "image_url": "https://...",
        "reason": "입력하신 체중(75kg)과 내전 성향을 고려할 때 가장 확실한 부상 방지 효과를 제공합니다. 또한 예산(20만 원) 내에서 구매 가능한 최적의 안정화입니다."
      }
    ]
  }
  ```
* **Response (Error/Fallback - 503):** Claude API 장애 시 미리 정의된 폴백 JSON 구조 반환.

---

### 7. 데이터 구조 (Google Sheets 기반 DB & ERD)

Google Sheets를 DB로 사용하므로, 각 탭(Sheet)을 하나의 Table로 간주하여 평면화(Denormalization)된 구조를 가져갑니다.

#### Sheet 1: `Shoes` (러닝화 메타 데이터 - 기준 정보)

| Column Name | Type | Description | Example |
|---|---|---|---|
| id | String | 고유 식별자 (Brand_Model) | ASICS_KAYANO30 |
| brand | String | 브랜드명 | Asics |
| model | String | 모델명 | Gel-Kayano 30 |
| type | String | 러닝화 타입 (안정화, 쿠션화, 레이싱 등) | Stability |
| pronation | String | 적합 발 타입 (내전, 외전, 중립) | Overpronation |
| price | Number | 정가 | 189000 |
| review_summary | String | 수집된 리뷰들의 긍/부정 핵심 요약 | "발볼이 넓어 편하지만, 무게가 다소 무거움" |

#### Sheet 2: `Logs` (사용자 이용 이력 및 피드백)

| Column Name | Type | Description | Example |
|---|---|---|---|
| log_id | UUID | 이력 고유 ID | 123e4567-e89b... |
| timestamp | DateTime | 조회 일시 | 2026-03-15 14:00:00 |
| user_input | JSON | 사용자가 입력한 조건 전체 | {"foot_type":"overpronation", ...} |
| recommended_shoes | String | 추천된 신발 ID 목록 | ASICS_KAYANO30, BROOKS_ADRENALINE23 |

#### ERD (Entity Relationship Diagram)

##### 관계 정의

| 엔티티 | 관계 | 엔티티 | 설명 |
|---|---|---|---|
| `Logs` | 1 : N (논리적 참조) | `Shoes` | 하나의 로그에 여러 추천 신발 포함 가능 |

> Google Sheets 환경이므로 물리적 FK 제약조건은 없으나, 애플리케이션 레벨에서 논리적 조인을 수행함

##### Shoes 엔티티

| Column Name | Type | Key | Description | Example |
|---|---|---|---|---|
| id | String | PK | 고유 식별자 (Brand_Model) | ASICS_KAYANO30 |
| brand | String | | 브랜드명 | Asics |
| model | String | | 모델명 | Gel-Kayano 30 |
| type | String | | 러닝화 타입 (안정화, 쿠션화, 레이싱 등) | Stability |
| pronation | String | | 적합 발 타입 (내전, 외전, 중립) | Overpronation |
| price | Number | | 정가 | 189000 |
| review_summary | String | | 수집된 리뷰들의 긍/부정 핵심 요약 | "발볼이 넓어 편하지만, 무게가 다소 무거움" |

##### Logs 엔티티

| Column Name | Type | Key | Description | Example |
|---|---|---|---|---|
| log_id | UUID | PK | 이력 고유 ID | 123e4567-e89b... |
| timestamp | DateTime | | 조회 일시 | 2026-03-15 14:00:00 |
| user_input | JSON | | 사용자가 입력한 조건 전체 | `{"foot_type":"overpronation", ...}` |
| recommended_shoes | String | | 추천된 신발 ID 목록 | ASICS_KAYANO30, BROOKS_ADRENALINE23 |

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

## origin/main 병합: STEP 1~4

<!-- merged from local: docs/SPEC_STEP1_DATA.MD -->
### STEP 1: 데이터 파이프라인
- 목적: 무신사 리뷰 텍스트를 6개 신발 속성 점수로 변환하여 `product_profiles.json` 생성.
- 수집 입력: `crawler/data/products.csv`, `crawler/data/reviews.csv`
- 현재 수집 현황: 30개 제품, 466건 리뷰. 페이지네이션 버그로 제품당 20건으로 제한 발생.
- 출력물: `product_profiles.json`
- 핵심 속성: `goods_no`, `goods_name`, `brand`, `brand_en`, `price`, `normal_price`, `sale_rate`, `is_sold_out`, `thumbnail`, `url`, `gender`, `avg_rating`, `review_count`
- 리뷰 속성: `review_no`, `goods_no`, `grade`, `content`, `size_option`, `like_count`, `has_image`, `user_height`, `user_weight`, `created_at`
- LLM 처리: Claude Haiku로 리뷰를 배치 처리해 `width`, `cushion`, `weight`, `distance`, `breathability`, `fit` 6개 속성 점수를 추출.
- 샘플 데이터: `reviews.csv` 앞부분 8건 리뷰는 품질 검증용 예시로 활용.

<!-- merged from local: docs/SPEC_STEP2_FORM.MD -->
### STEP 2: 사용자 입력 폼 / JSON 스키마
- 목표: 사용자가 30초~1분 내에 클릭만으로 발 상태와 러닝 습관을 입력하여 추천 엔진이 이해할 수 있는 JSON 프로필로 변환.
- 질문 구성:
  1. 주로 달리는 거리 (`running_distance`): short / medium / long / marathon
  2. 러닝 빈도 (`frequency`): casual / regular / intensive
  3. 발볼 유형 (`foot_width`): wide / normal / narrow
  4. 선호 쿠션감 (`preferred_cushion`): 1~5
  5. 중요 요소 (`priorities`): speed / protection / comfort / breathability / design
  6. 예산 (`budget`): low / mid / high / premium / null
  7. 추가 설명 (`free_text`)
- JSON 예시:
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
- 필드 상세:
  - `running_distance`: short / medium / long / marathon
  - `frequency`: casual / regular / intensive
  - `foot_width`: wide / normal / narrow
  - `preferred_cushion`: 1~5
  - `priorities`: speed / protection / comfort / breathability / design
  - `budget`: low / mid / high / premium / null
  - `free_text`: 최대 200자 자유 입력
- 유효성 검증:
  - `running_distance`, `foot_width` 필수
  - `priorities` 최대 3개
  - `free_text` 최대 200자

<!-- merged from local: docs/SPEC_STEP3_ENGINE.MD -->
### STEP 3: 추천 엔진
- 목표: 사용자 프로필과 제품 DB를 결합해 상위 3개 러닝화 추천 및 한국어 추천 이유 생성.
- 방식 A: LLM 실시간 추천 (권장)
  - 장점: free_text 반영, 자연어 추천 이유 생성
  - 단점: API 비용, 응답 지연
  - 필요: FastAPI 또는 Node.js 서버
- 방식 B: 로컬 규칙 기반 매칭 (폴백)
  - 장점: 서버 없음, GitHub Pages 배포 가능
  - 단점: free_text 반영 제한, 추천 이유 템플릿화
- LLM 프롬프트 구성:
  - 사용자 프로필 라벨링
  - 신발 DB 직렬화
  - 추천 규칙 및 출력 JSON 형식 명시
- 출력 JSON 예시:
```json
{
  "recommendations": [
    {
      "goods_no": "3901126",
      "rank": 1,
      "match_score": 88,
      "reason": "발볼이 넓은 고객에게 좋은 전족부 공간과 쿠션감 4/5를 제공합니다. 리뷰에 '발볼 넓어도 편안하다'는 후기가 다수 존재합니다.",
      "highlight_features": ["넓은 발볼", "높은 쿠션", "장거리 적합"],
      "caution": "통기성 2/5로 여름 착화 시 주의"
    }
  ],
  "overall_advice": "발볼이 넓고 장거리 주행이 목적이라면 쿠션과 발볼 여유가 핵심입니다. 1순위 추천 제품부터 착용해 보세요."
}
```
- 로컬 매칭 점수 예시:
  - 발볼 매칭: 40점
  - 쿠션 차이: 30점
  - 거리 매칭: 20점
  - 예산 만족: 10점

<!-- merged from local: docs/SPEC_STEP4_FRONTEND.MD -->
### STEP 4: 프론트엔드 웹 프로토타입
- 파일 구조:
  - `frontend/index.html`
  - `frontend/result.html`
  - `frontend/style.css`
  - `frontend/app.js`
  - `frontend/recommend.js`
  - `frontend/data/product_profiles.json`
- 핵심 페이지:
  - `index.html`: 7개 질문 기반 러닝화 진단 폼
  - `result.html`: 추천 결과 카드, AI 설명, 재진단 버튼
- 주요 역할:
  - `app.js`: 입력 수집, 유효성 검사, 로딩 상태, 결과 페이지 이동
  - `recommend.js`: LLM API 호출 및 로컬 폴백 추천 로직
- 배포 목표: GitHub Pages 공개 배포
- UX 포인트: 모바일 퍼스트, 손쉬운 선택지, 추천 결과 카드 중심


