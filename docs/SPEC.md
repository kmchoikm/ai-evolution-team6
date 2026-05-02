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
git add docs/SPEC.md
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