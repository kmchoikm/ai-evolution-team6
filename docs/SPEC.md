# SPEC.md
## RunFit — 상세 기능 및 기술 명세서

이 문서는 RunFit 서비스의 구현을 위한 상세 개발 스펙을 정의합니다. 모든 코드 작성 및 시스템 설계는 이 문서를 기준으로 진행됩니다.

---

### 변경 이력 (Revision History)

| 버전 | 날짜 | 유형 | 항목 | 작성자 |
|------|------|------|------|--------|
| v2.2 | 2026-05-14 | 구조 개선 | §1 전면 재구성 — 홈 허브 중심 목차화 + §1.0 전체 시나리오 블록 다이어그램 추가 | kmchoikm |
| v2.2 | 2026-05-14 | 구조 개선 | §8 전면 재구성 — §1 시나리오와 1:1 대응 콜 플로우, 시퀀스 다이어그램 시각화 | kmchoikm |
| v2.2 | 2026-05-14 | 수정 | §5: Feature 번호 워딩 제거, §5.X 번호 체계로 통일 | kmchoikm |
| v2.2 | 2026-05-14 | 삭제 | §5·§8: 구현 우선순위 관련 내용 전체 삭제 | kmchoikm |
| v2.2 | 2026-05-14 | 추가 | §5.1: TOP 비교 모달 기능 요구사항 추가 | kmchoikm |
| v2.2 | 2026-05-14 | 삭제 | §5.3: localStorage 재방문 개인화 내용 삭제 | kmchoikm |
| v2.2 | 2026-05-14 | 수정 | §5.9: localStorage 재방문 연계 항목 삭제, 결과 연계 UX 항목만 유지 | kmchoikm |
| v2.2 | 2026-05-14 | 추가 | §6.11: GET /api/shoes — 신발 목록 조회 API 추가 | kmchoikm |
| v2.2 | 2026-05-14 | 수정 | 추천 결과 최대 5개로 통일 (§1.2, §5.2, §8.1, §6.1) | kmchoikm |
| v2.2 | 2026-05-14 | 수정 | Claude API Timeout 5초로 통일 (§5.2, §8.9) | kmchoikm |
| v2.2 | 2026-05-14 | 수정 | §1.2 유효성 검증에 Q5·Q7 검증 항목 추가 | kmchoikm |
| v2.3 | 2026-05-14 | 수정 | §5.3 홈 화면 허브 구조 — §1.0 블록 다이어그램·§1.1 시나리오와 1:1 정합성 맞춰 재작성 | kmchoikm |
| v2.3 | 2026-05-14 | 수정 | §7 ERD 동기화 정책 추가 — §7이 단일 진실 소스, ddl.js·dml.js 동기화 규칙 명시 | kmchoikm |
| v2.1 | 2026-05-13 | 구조 개선 | §3 기술 스택을 §5 앞으로 이동 (§3↔§5 번호 교환). §3.X → §5.X 전체 참조 갱신 | kmchoikm |
| v2.1 | 2026-05-13 | 구조 개선 | §6 API 명세 전면 재작성 — 표준 포맷(설명·시나리오·필드·요청·응답·예시) 적용 | kmchoikm |
| v2.1 | 2026-05-13 | 삭제 | `docs/SEED_DATA.md` 제거 — `backend/db/dml.js`를 단일 시드 소스로 확정 | kmchoikm |
| v2.0 | 2026-05-13 | 추가 | §1 홈 허브 진입 플로우 추가 | Juno |
| v2.0 | 2026-05-13 | 추가 | §5.3 홈 화면 허브 구조 전환 | Juno |
| v2.0 | 2026-05-13 | 추가 | §5.4~§5.10 신규 기능 7개 추가 | Juno |
| v2.0 | 2026-05-13 | 수정 | §6 API: 신규 엔드포인트 9개 추가 | Juno |
| v2.0 | 2026-05-13 | 수정 | §7 DB: `Shoes` 컬럼 5개 추가, 신규 시트 4개 (`Celebs`, `RaceWinners`, `Races`, `SizeGuide`) | Juno |
| v2.0 | 2026-05-13 | 분리 | 전체 시트 초기 데이터를 `dml.js`로 통합 | kmchoikm |
| v1.0 | 2026-05-03 | 최초 작성 | 전체 MVP 기능 정의 (§1 ~ §8) | kmchoikm |

---

### 1. 사용자 시나리오 (User Scenario)

> **목적:** 서비스 진입부터 결과 도출까지 핵심 흐름 정의 (이탈률 최소화 관점)

#### 1.0 전체 시나리오 개요 (Overview)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          홈 화면 (Hub)                               │
│                                                                      │
│   ┌──────────────────────────────────────────┐                       │
│   │           내 러닝화 추천받기  →            │  ← Primary CTA       │
│   └──────────────────────────────────────────┘                       │
│   ┌──────────────┬──────────────┬─────────────┐                      │
│   │  교체 계산기  │  대회 코스   │  셀럽/우승자  │  ← 보조 서비스 카드  │
│   └──────────────┴──────────────┴─────────────┘                      │
└──────┬──────────────────┬──────────────┬──────────┬──────────────────┘
       │                  │              │          │
       ▼                  ▼              ▼          ▼
  [§1.2]             [§1.3]          [§1.4]     [§1.5]
AI 러닝화 추천      대회 코스 추천   셀럽/우승자  교체 시기
Q1~Q7 입력         대회 선택 →      착용신발탐색  계산기
       │             추천 결과      탭:셀럽|우승자
       │
       ▼
 추천 결과 (최대 5개 카드)
 ┌──────────────────────────────┐
 │  TOP 1 vs TOP 2 비교 모달    │
 └──────────────────────────────┘
       │
   ┌───┴──────────────────┐
   ▼                      ▼
[§1.6]                 [§1.8]
양말 색상 추천          사이즈 핏 가이드
   │
   ▼
[§1.7]
러닝 코디 추천
```

> **시나리오 → 콜 플로우 대응표**
>
> | 시나리오 | 진입점 | 연관 API | 콜 플로우 |
> |---|---|---|---|
> | §1.2 AI 러닝화 추천 | 홈 Primary CTA | `POST /api/recommend` | §8.1 |
> | §1.3 대회 코스 추천 | 홈 "대회 코스" 카드 | `GET /api/races`, `POST /api/recommend/race` | §8.2 |
> | §1.4 셀럽 착용 신발 | 홈 "셀럽/우승자" → 셀럽 탭 | `GET /api/celebs`, `GET /api/celebs/:id` | §8.3 |
> | §1.4 우승자 착용 신발 | 홈 "셀럽/우승자" → 우승자 탭 | `GET /api/race-winners` | §8.4 |
> | §1.5 교체 시기 계산기 | 홈 "교체 계산기" 카드 | `GET /api/shoes`, `POST /api/shoes/lifespan` | §8.5 |
> | §1.6 양말 색상 추천 | 추천 결과 하단 | `POST /api/recommend/socks` | §8.6 |
> | §1.7 러닝 코디 추천 | 양말 색상 선택 후 | `POST /api/recommend/outfit` | §8.7 |
> | §1.8 사이즈 핏 가이드 | 추천 결과 하단 링크 | `GET /api/shoes`, `POST /api/size/convert` | §8.8 |

---

#### 1.1 홈 화면 (진입 허브)

홈 화면은 RunFit의 모든 서비스 진입점이다. Primary CTA로 메인 추천 플로우에 직행하거나, 보조 서비스 카드 3개를 통해 각 기능에 접근한다.

**레이아웃**

```
┌─────────────────────────┐
│  RunFit                 │
│  달리는 사람의 편의를    │
│  데이터가 맞히게         │
│                         │
│  ┌───────────────────┐  │
│  │ 내 러닝화 추천받기 →│  │  ← Primary CTA (전체폭)
│  └───────────────────┘  │
│                         │
│  ┌──────┬──────┬──────┐  │
│  │교체  │대회  │셀럽/ │  │  ← 보조 서비스 카드 3개
│  │계산기│코스  │우승자│  │
│  └──────┴──────┴──────┘  │
└─────────────────────────┘
```

**진입 경로**

| 카드/버튼 | 목적지 | 참조 시나리오 |
|---|---|---|
| "내 러닝화 추천받기" (Primary CTA) | Q1~Q7 설문 폼 (`index.html`) | §1.2 |
| "교체 계산기" 카드 | 러닝화 교체 시기 계산기 | §1.5 |
| "대회 코스" 카드 | 대회 코스 기반 추천 | §1.3 |
| "셀럽/우승자" 카드 | 셀럽·우승자 착용 신발 탐색 | §1.4 |

---

#### 1.2 AI 러닝화 추천

1. **진입:** "내 러닝화 추천받기" 클릭 → "3분 진단 — 7개 질문에 답하면 AI가 가장 적합한 러닝화를 추천합니다" 문구와 함께 단일 스크롤 폼 표시.

2. **7개 질문 입력 (단일 페이지 스크롤):**

   | 번호 | 질문 | 입력 방식 | 필수 |
   |------|------|-----------|------|
   | Q1 | 주로 달리는 거리 | 라디오 (4개 옵션) | ✅ |
   | Q2 | 러닝 빈도 | 라디오 (3개 옵션) | - (기본: 주 3~4회) |
   | Q3 | 발볼 너비 | 라디오 (3개 옵션) | ✅ |
   | Q4 | 선호 쿠션감 | 슬라이더 (1~5단계) | - (기본: 3) |
   | Q5 | 중요 요소 | 체크박스 (최대 3개) | - |
   | Q6 | 예산 범위 | 라디오 (5개 옵션) | - |
   | Q7 | 추가 자유 서술 | 텍스트에어리어 (200자 이내) | - |

3. **유효성 검증 및 제출:** "추천 받기" 버튼 클릭 시 아래 조건을 순서대로 검사한다. 오류가 있으면 에러 메시지를 노출하고 제출을 막는다.

   | 조건 | 처리 |
   |------|------|
   | Q1 미선택 | 제출 차단, "Q1 '달리는 거리'를 선택해 주세요." 표시 |
   | Q3 미선택 | 제출 차단, "Q3 '발볼 유형'을 선택해 주세요." 표시 |
   | Q5 4개 이상 선택 | 마지막 항목 자동 해제, 토스트 경고 2초 표시 |
   | Q7 200자 초과 | 제출 차단, "Q7 추가 내용은 200자 이내로 입력해 주세요." 표시 |

4. **데이터 전달 및 이동:** 검증 통과 시 로딩 오버레이("AI가 최적의 러닝화를 찾고 있어요...") 표시. 프로필 JSON을 `sessionStorage`에 저장 후 800ms 뒤 `result.html`로 이동.

5. **결과 표시 (`result.html`):** 프로필 요약 태그(거리·발볼·쿠션·예산·우선순위) 상단 표시. 매칭 점수 기준 상위 **최대 5개** 러닝화 카드 노출. 각 카드: 브랜드·모델명·매칭 점수(%)·추천 이유·스펙 태그·가격·무신사 링크.

6. **TOP 비교 모달:** 결과가 2개 이상이면 "TOP 1 vs TOP 2 비교" 버튼 활성화 → 모달 팝업으로 브랜드·쿠션·발볼·무게·통기성·착화감 나란히 비교.

7. **결과 확장 서비스:**

   | 버튼/링크 | 목적지 |
   |---|---|
   | 결과 카드 하단 "어울리는 양말 색상" | §1.6 양말 색상 추천 |
   | 결과 페이지 하단 "사이즈 변환" 링크 | §1.8 사이즈 핏 가이드 |

8. **예외 처리:**
   - 매칭 점수 30점 미만만 존재 → "맞는 추천이 없습니다" empty-state + 조건 재조정 힌트
   - 데이터 로드 실패 → 에러 메시지 + "다시 시도" 버튼
   - `sessionStorage` 없음 → `index.html` 자동 리다이렉트

---

#### 1.3 대회 코스 기반 러닝화 추천

1. 홈 "대회 코스" 카드 클릭 → 대회 목록 페이지 (국내 / 세계 탭 분리)
2. 대회 선택 → 하프/풀 선택 (필수) → 코스 특징 카드 표시 (기온·난이도·노면·고도·요약)
3. "이 코스에 맞는 신발 추천받기" 클릭 → 추천 신발 최대 5개 카드
4. 선택적으로 "내 발 조건 함께 반영" 클릭 → Q1~Q7 일부 항목 추가 입력으로 개인화 강화

---

#### 1.4 셀럽 / 우승자 착용 신발 탐색

홈 "셀럽/우승자" 카드 클릭 → 상단 탭으로 [셀럽] / [대회 우승자] 분리.

**[셀럽 탭]**
1. 셀럽 카드 목록 표시 (이미지·이름·유형: 운동선수·인플루언서·유튜버 등)
2. 셀럽 선택 → 해당 셀럽 착용 신발 카드 목록 (기존 추천 결과 카드 컴포넌트 재사용)

**[대회 우승자 탭]**
1. 대회명·연도 필터 → 우승자 카드 목록 (이름·기록·국적)
2. 우승자 선택 → 착용 신발 카드

---

#### 1.5 러닝화 교체 시기 계산기

1. 홈 "교체 계산기" 카드 클릭 → 교체 계산기 페이지
2. 신발 브랜드 + 모델명 입력 (Shoes DB 자동완성 드롭다운)
3. 구매 시점 (년·월) 선택
4. 누적 거리 입력 방식 선택 → Option A: 주간 평균 거리 / Option B: 총 누적 거리 직접 입력
5. "계산하기" 클릭 → 사용률(%) + 수명 판정 결과 표시
6. 교체 필수 판정 시 "지금 바로 추천받기 →" 버튼으로 §1.2 AI 러닝화 추천 플로우 연결

---

#### 1.6 양말 색상 추천

1. 추천 결과 카드 하단 "어울리는 양말 색상" 섹션 접근
2. Claude API가 신발 색상 데이터(주조색·포인트색) 기반으로 어울리는 양말 색상 3가지 추천
3. 색상원(Circle) + 색상명 + 추천 이유 표시
4. "전체 코디 보기" 버튼 클릭 → §1.7 러닝 코디 추천으로 연결

---

#### 1.7 러닝 코디 추천

1. §1.6에서 양말 색상 선택 후 "전체 코디 보기" 클릭
2. Claude API가 신발·양말 색상 기반으로 상의·하의·모자 코디 각 2~3가지 추천
3. (Phase A) 색상 칩 + 색상명 + 이유 텍스트 표시
4. (Phase B) SVG 템플릿에 색상 동적 적용 → 인터랙티브 시각화

---

#### 1.8 사이즈 핏 가이드

1. 추천 결과 하단 "사이즈 변환" 링크 또는 홈 화면에서 직접 접근
2. 현재 신발 (브랜드·모델·사이즈 mm) 입력
3. 변환할 신발 (브랜드·모델) 선택
4. "변환하기" 클릭 → 권장 사이즈(mm) + 핏 설명 + 발볼 주의사항 표시

---

### 2. 타겟 단말 (Client)
* **디바이스:** 모바일 단말(스마트폰) 최우선 고려 (Mobile-First Design)
* **환경:** 모바일 웹 브라우저 (Safari, Chrome, Samsung Internet 등)
* **UI/UX 원칙:** 반응형 웹(Responsive Web)으로 구현하되, 터치 친화적인 큼직한 버튼과 스와이프 가능한 카드 UI를 적극 활용한다. (가로 스크롤 지양, 세로 스크롤 위주)

---

### 3. 기술 스택 (Tech Stack)

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

### 5. 기능 요구사항 (Functional Requirements)

#### 5.1. 사용자 입력 폼 (프론트엔드) — v1.0

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

**TOP 비교 모달**

* 추천 결과가 2개 이상이면 "TOP 1 vs TOP 2 비교" 버튼이 활성화된다.
* 비교 항목: 브랜드, 모델명, 쿠션감, 발볼, 무게감, 통기성, 착화감, 가격, 매칭 점수 (총 9개 항목).
* 모달 팝업으로 두 상품을 나란히 표시한다.
* `≤ 480px`에서 셀 패딩과 폰트를 줄이고 속성 열 너비를 축소하여 가로 스크롤 없이 표시한다.

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

---

#### 5.2. 추천 엔진 및 LLM 연동 (백엔드) — v1.0

* **데이터 필터링 (1차):** 사용자가 입력한 조건(예산, 발볼, 내전 여부)을 바탕으로 Google Sheets(DB)에서 조건에 맞지 않는 신발을 1차로 필터링한다. (환각 방지 및 AI 토큰 절약)
* **Claude API 호출 (2차):** 필터링된 후보군 N개와 사용자 프로파일을 Claude API 프롬프트에 주입하여 최종 **5개**를 선정하고, **"자연어로 된 맞춤형 추천 사유"**를 생성한다.
* **타임아웃 및 폴백(Fallback) (PREMORTEM D1 리스크 대응):** API 응답이 **5초** 이상 지연될 경우 통신을 끊고, DB에 하드코딩된 '안정성 위주의 베스트셀러(예: 브룩스 아드레날린, 아식스 카야노 등)'를 폴백 데이터로 즉시 반환한다.

---

#### 5.3. 홈 화면 허브 구조 (v2.0)

홈 화면은 RunFit 모든 기능의 진입점(Hub)이다. Primary CTA 1개와 보조 서비스 카드 3개로 구성되며, **§1.0 전체 시나리오 개요 블록 다이어그램 및 §1.1 홈 화면 시나리오와 1:1 대응**한다.

**레이아웃 구성 요소**

| 영역 | 컴포넌트 | 텍스트 / 설명 | 연결 시나리오 |
|---|---|---|---|
| 헤더 | 서비스명 + 태그라인 | `RunFit` / `달리는 사람의 편의를 데이터가 맞히게` | — |
| Primary CTA | 전체폭 버튼 | `내 러닝화 추천받기 →` | §1.2 AI 러닝화 추천 |
| 보조 카드 1 | 아이콘 + 라벨 | `교체 계산기` | §1.5 러닝화 교체 시기 계산기 |
| 보조 카드 2 | 아이콘 + 라벨 | `대회 코스` | §1.3 대회 코스 기반 추천 |
| 보조 카드 3 | 아이콘 + 라벨 | `셀럽/우승자` (탭 전환 포함) | §1.4 셀럽·우승자 착용 신발 |

**레이아웃 (§1.1 시나리오와 동일)**

```
┌─────────────────────────┐
│  RunFit                 │
│  달리는 사람의 편의를    │
│  데이터가 맞히게         │
│                         │
│  ┌───────────────────┐  │
│  │ 내 러닝화 추천받기 →│  │  ← Primary CTA (전체폭)
│  └───────────────────┘  │
│                         │
│  ┌──────┬──────┬──────┐  │
│  │교체  │대회  │셀럽/ │  │  ← 보조 서비스 카드 3개 (동일 폭)
│  │계산기│코스  │우승자│  │
│  └──────┴──────┴──────┘  │
└─────────────────────────┘
```

**기능 요구사항**

* Primary CTA는 화면 전체 폭으로 배치하여 첫 시선을 집중시킨다.
* 보조 서비스 카드 3개는 동일 폭으로 가로 정렬한다. (flex row, 각 1/3)
* 카드·버튼 터치 시 해당 시나리오 진입 화면으로 즉시 이동한다. (중간 로딩 화면 없음)
* 홈 화면은 항상 루트 경로(`/`)에 위치하며, 모든 하위 페이지에서 Back 네비게이션으로 복귀 가능해야 한다.
* §1.0 블록 다이어그램에 명시된 7개 시나리오 중 홈에서 직접 노출되는 진입점은 **4개** (§1.2~§1.5) 이며, §1.6~§1.8은 추천 결과 화면의 하위 액션으로만 접근된다.

**모바일 최적화 규칙**

* Primary CTA 버튼 높이 ≥ 56px (터치 영역 최소치)
* 보조 카드 높이 ≥ 80px, 라벨 텍스트는 2줄 이내
* 홈 진입 시 LCP(Largest Contentful Paint) ≤ 2.5s — 이미지·폰트 지연 로딩 금지

---

#### 5.4. 셀럽 / 인플루언서 착용 신발 (v2.0)

운동선수·인플루언서·유튜버 등 셀럽이 실제 착용한 신발을 보여주는 별도 진입 경로.
홈 화면 보조 서비스 카드 "셀럽/우승자" 탭에서 진입한다.

**DB 변경:** 신규 `Celebs` 시트 추가 → §7.3 참조

**UI 흐름**

홈 "셀럽/우승자" 카드 → 셀럽 탭 선택 → 셀럽 카드 목록(이미지·이름·유형) → 셀럽 선택 → 착용 신발 카드 (기존 결과 카드 컴포넌트 재사용)

---

#### 5.5. 신발에 어울리는 양말 색상 추천 (v2.0)

신발 추천 결과 이후 Claude API가 색상 이론 기반으로 어울리는 양말 색상 3가지를 추천한다.
기존 추천 결과 카드의 확장 UI로 제공한다.

**DB 변경:** `Shoes` 시트에 `main_color`, `accent_color` 컬럼 추가 → §7.1 참조

**UI**

추천 결과 카드 하단 "어울리는 양말 색상" 섹션 → 색상원(Circle) + 색상명 + 추천 이유 텍스트

---

#### 5.6. 러닝 코디 추천 + 가상 코디 시각화 (v2.0)

신발·양말 색상 결정 후 상의·하의·모자 등 코디 아이템 추천 및 SVG 기반 가상 코디 시각화.
§5.5 완료 후 자연스러운 확장으로 구현한다.

**DB 변경:** §5.5에서 추가된 `main_color`, `accent_color` 컬럼을 그대로 활용. 별도 스키마 변경 없음.

**구현 2단계**

| Phase | 내용 | 난이도 | 외부 비용 |
|---|---|---|---|
| A (단기) | 색상 팔레트 추천 — 색상 칩 + 색상명 + 이유 텍스트 | 낮음 | 없음 |
| B (중기) | 미리 정의된 러닝 의상형 SVG 템플릿에 `hex_code` 동적 적용 | 중간 | 없음 |

> AI 이미지 생성(DALL-E 등)은 API 비용 발생 및 응답 속도 문제로 채택하지 않는다. SVG 템플릿 방식으로 추가 비용 없이 구현한다.

**UI 흐름**

양말 색상 확인 → "전체 코디 보기" 버튼 → 코디 색상 팔레트 카드 → (Phase B) SVG 인터랙티브 시각화

---

#### 5.7. 마라톤 대회 우승자 착용 신발 (v2.0)

국내외 주요 마라톤 대회 우승자가 착용한 신발 데이터를 기반으로 탐색 및 추천.
홈 화면 보조 서비스 카드 "셀럽/우승자" 탭에서 §5.4(셀럽)과 탭 분리로 제공한다.

**DB 변경:** 신규 `RaceWinners` 시트 추가 → §7.4 참조

**UI 흐름**

"셀럽/우승자" 카드 → 우승자 탭 선택 → 대회명·연도 필터 → 우승자 카드(이름·기록·국적) + 착용 신발 카드

---

#### 5.8. 대회 코스 기반 러닝화 추천 (v2.0)

출전 예정 대회와 코스 유형(하프/풀)을 선택하면 코스 특징을 분석하고 최적 러닝화를 추천한다.
기존 Q1~Q7 플로우와 독립된 새로운 진입 경로로 제공한다.

**대상 대회:** 세계 7대 + 국내 23개 (총 30개) → 초기 데이터는 `backend/db/dml.js` 참조

**DB 변경:** 신규 `Races` 시트 추가 → §7.5 참조

**UI 흐름**

홈 "대회 코스" 보조 카드 → 국내/세계 탭 분리 → 대회 선택 → 하프/풀 선택 (필수) → 코스 특징 카드(기온·난이도·노면·고도·요약) → 추천 신발 카드 최대 5개 → "내 발 조건도 함께 반영" 클릭 시 Q1~Q7 일부 항목 추가 입력 가능

---

#### 5.9. 러닝화 교체 시기 계산기 (v2.0)

현재 소유 중인 러닝화의 구매 시점과 누적 주행 거리를 입력하면 교체 필요 여부와 예상 교체 시기를 알려준다.
홈 화면 보조 서비스 카드 "교체 계산기"에서 진입한다.

**DB 변경:** `Shoes` 시트에 `lifespan_km_min`, `lifespan_km_max`, `has_carbon_plate` 컬럼 추가 → §7.1 참조

**입력 항목**

| 항목 | 입력 방식 | 필수 |
|---|---|---|
| 신발 브랜드 + 모델명 | Shoes DB 자동완성 드롭다운 | ✅ |
| 구매 시점 | 년·월 선택 (월 단위) | ✅ |
| 누적 거리 입력 방식 선택 | 라디오 (A/B 중 선택) | ✅ |
| Option A: 주간 평균 거리 (km) | 숫자 입력 → 시스템이 총 누적 계산 | - |
| Option B: 총 누적 거리 직접 입력 (km) | 숫자 입력 | - |

**수명 판정 기준**

| 사용률 | 상태 | 사용자 메시지 |
|---|---|---|
| ~50% | 양호 | "아직 충분히 쓸 수 있어요. 약 OOkm 남았습니다." |
| 50~80% | 주의 | "교체를 고려할 시기입니다. 다음 대회 전 점검하세요." |
| 80~100% | 교체 권장 | "쿠션 성능이 저하됐을 수 있습니다. 교체를 권장합니다." |
| 100% 초과 | 교체 필수 | "부상 위험 구간입니다. 즉시 교체를 권장합니다." |

> LLM 불필요 — 순수 계산 로직으로 구현 (`lifespan_km_min/max`, `has_carbon_plate` 컬럼 활용)

**결과 연계 UX**

- 결과 하단 "OO개월 후 교체 예정" 문구 노출
- 교체 시기가 추천 예정 대회 일정과 겹칠 경우 경고 메시지 표시
- 교체 필수 판정 시 "지금 바로 추천받기 →" 버튼으로 §1.2 AI 러닝화 추천 플로우 연결

---

#### 5.10. 사이즈 핏 가이드 (v2.0)

"아식스 젤 카야노 260mm를 신는데 뉴발란스 페이퍼에서 몇 mm를 사야 하나요?"처럼
브랜드 간 사이즈 편차를 반영하여 최적 사이즈를 추천한다.

**DB 변경:** 신규 `SizeGuide` 시트 추가 → §7.6, 초기 데이터 → `backend/db/dml.js` 참조

> LLM 선택적 사용 — 기본 변환은 `size_adjust_mm` 계산 로직으로 처리하고, `fit_note` 코멘트 생성 시에만 Claude API 선택적 활용 가능

**UI 흐름**

홈 화면 또는 추천 결과 하단 "사이즈 변환" 링크 → 현재 신발(브랜드·모델·사이즈) 입력 → 비교할 신발(브랜드·모델) 선택 → 추천 사이즈 + 핏 설명 + 발볼 주의사항 출력

---

### 6. API 명세 (API Specifications)

> **표준 포맷:** 설명 → 연관 시나리오 → 필드 → Request → Response (정상·조건없음·오류)

---

#### 6.1 [POST] `/api/recommend` — v1.0

**설명**
사용자 Q1~Q7 프로필을 받아 1차 필터링 후 Claude AI로 최적 러닝화 최대 5종과 맞춤형 추천 사유를 반환한다.

**연관 시나리오**
§1.2 AI 러닝화 추천

**Request Body 필드**

| 필드명 | 타입 | 허용값 | 필수 | 설명 |
|---|---|---|---|---|
| `running_distance` | string | `short` / `medium` / `long` / `marathon` | ✅ | 주로 달리는 거리 |
| `frequency` | string | `casual` / `regular` / `intensive` | - | 러닝 빈도 (기본값: `regular`) |
| `foot_width` | string | `wide` / `normal` / `narrow` | ✅ | 발볼 너비 |
| `preferred_cushion` | number | 1~5 정수 | - | 선호 쿠션감 (기본값: `3`) |
| `priorities` | string[] | `speed` / `protection` / `comfort` / `breathability` / `design` (최대 3개) | - | 중요 요소 |
| `budget` | string | `low` / `mid` / `high` / `premium` | - | 예산 범위 |
| `free_text` | string | 최대 200자 | - | 자유 서술 |

**Request**
```json
{
  "user_profile": {
    "running_distance": "medium",
    "frequency": "regular",
    "foot_width": "wide",
    "preferred_cushion": 3,
    "priorities": ["protection", "comfort"],
    "budget": "high",
    "free_text": "평발이에요"
  }
}
```

**Response Body 필드 (정상)**

| 필드명 | 타입 | 설명 |
|---|---|---|
| `rank` | number | 추천 순위 (1~5) |
| `match_score` | number | 매칭 점수 (0~100) |
| `goods_no` | string | 상품 고유번호 (PK) |
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

*정상 (200 OK)*
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

*조건 없음 (200 OK)*
```json
{
  "status": "no_match",
  "message": "입력하신 조건에 맞는 러닝화가 없습니다. 예산 범위나 발볼 조건을 조정해 보세요.",
  "recommendations": []
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.2 [GET] `/api/races` — v2.0

**설명**
대회 목록을 반환한다. 쿼리 파라미터로 국내/해외, 세계 메이저 여부, 코스 유형을 필터링할 수 있다.

**연관 시나리오**
§1.3 대회 코스 기반 러닝화 추천

**Query 파라미터**

| 파라미터명 | 타입 | 허용값 | 필수 | 설명 |
|---|---|---|---|---|
| `country` | string | 국가 코드 (예: `KR`, `JP`) | - | 해당 국가 대회만 필터 |
| `is_world_major` | boolean | `true` / `false` | - | 세계 메이저 여부 필터 |
| `course_type` | string | `half` / `full` | - | 코스 유형 필터 |

**Request**
```
GET /api/races?country=KR&course_type=full
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "races": [
    {
      "race_id": "seoul_full",
      "race_name": "서울 마라톤",
      "country": "KR",
      "city": "서울",
      "course_type": "full",
      "typical_month": 3,
      "avg_temp_celsius": 8,
      "surface_type": "asphalt",
      "elevation_gain_m": 42,
      "difficulty": 1,
      "course_summary": "광화문~잠수, 도심 평탄, 국내 최고 권위",
      "shoe_priority_hint": "경량, 반발력",
      "is_world_major": false,
      "is_active": true
    }
  ]
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.3 [POST] `/api/recommend/race` — v2.0

**설명**
선택한 대회의 코스 특성을 분석하여 최적 러닝화 최대 5종을 추천한다. 선택적으로 Q1~Q7 사용자 프로필을 함께 전달하면 개인화 강도가 높아진다.

**연관 시나리오**
§1.3 대회 코스 기반 러닝화 추천

**Request Body 필드**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `race_id` | string | ✅ | 선택한 대회 ID (예: `jtbc_half`) |
| `course_type` | string | ✅ | `half` / `full` |
| `user_profile` | object | - | Q1~Q7 프로필 객체 (전달 시 개인화 강화) |

**Request**
```json
{
  "race_id": "jtbc_half",
  "course_type": "half",
  "user_profile": {
    "foot_width": "normal",
    "preferred_cushion": 3,
    "budget": "high"
  }
}
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "race": {
    "race_name": "JTBC 서울 마라톤",
    "course_type": "half",
    "course_summary": "도심 평탄, 하반 완만 오르막, 한강변 포함",
    "difficulty": 2,
    "avg_temp_celsius": 12,
    "surface_type": "asphalt",
    "elevation_gain_m": 85
  },
  "recommendations": [
    {
      "rank": 1,
      "goods_no": "4112233",
      "goods_name": "젤 카야노 31",
      "brand": "아식스",
      "match_score": 82,
      "reason": "완만한 오르막 반복 코스에서 안정성과 쿠션이 중요합니다.",
      "is_fallback": false
    }
  ]
}
```

*조건 없음 (200 OK)*
```json
{
  "status": "no_match",
  "message": "해당 코스 조건에 맞는 러닝화가 없습니다.",
  "recommendations": []
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.4 [GET] `/api/race-winners` — v2.0

**설명**
대회 우승자 목록을 반환한다. 대회명, 연도, 코스 유형으로 필터링 가능하다.

**연관 시나리오**
§1.4 우승자 착용 신발 탐색

**Query 파라미터**

| 파라미터명 | 타입 | 허용값 | 필수 | 설명 |
|---|---|---|---|---|
| `race_name` | string | 대회명 (부분 일치) | - | 특정 대회 우승자 필터 |
| `race_year` | number | 연도 정수 | - | 특정 연도 필터 |
| `course_type` | string | `half` / `full` | - | 코스 유형 필터 |

**Request**
```
GET /api/race-winners?race_name=베를린&race_year=2023
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "winners": [
    {
      "winner_id": "winner_001",
      "race_name": "베를린 마라톤",
      "race_year": 2023,
      "winner_name": "Eliud Kipchoge",
      "winner_nationality": "케냐",
      "course_type": "full",
      "result_time": "2:02:42",
      "goods_no": "4200001",
      "source_url": "https://..."
    }
  ]
}
```

*조건 없음 (200 OK)*
```json
{
  "status": "no_match",
  "message": "해당 조건의 우승자 데이터가 없습니다.",
  "winners": []
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.5 [POST] `/api/shoes/lifespan` — v2.0

**설명**
사용 중인 러닝화의 구매 시점과 누적 거리를 입력하면 사용률(%)과 교체 판정 결과를 반환한다. LLM 없이 순수 계산 로직으로 처리한다.

**연관 시나리오**
§1.5 러닝화 교체 시기 계산기

**Request Body 필드**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `goods_no` | string | ✅ | 신발 고유번호 |
| `purchase_year_month` | string | ✅ | 구매 시점 (`YYYY-MM`) |
| `weekly_km` | number | - | Option A: 주간 평균 거리 (km). `total_km`과 둘 중 하나 필수 |
| `total_km` | number | - | Option B: 총 누적 거리 (km). `weekly_km`과 둘 중 하나 필수 |

**Request**
```json
{
  "goods_no": "4112233",
  "purchase_year_month": "2024-03",
  "weekly_km": 30
}
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "goods_name": "젤 카야노 31",
  "brand": "아식스",
  "estimated_total_km": 630,
  "lifespan_km_min": 600,
  "lifespan_km_max": 800,
  "usage_rate": 87,
  "verdict": "replace_recommended",
  "message": "쿠션 성능이 저하됐을 수 있습니다. 교체를 권장합니다.",
  "remaining_km": 70
}
```

> `verdict` 허용값: `good` / `caution` / `replace_recommended` / `replace_required`

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.6 [GET] `/api/celebs` — v2.0

**설명**
셀럽 목록을 반환한다. `celeb_type`으로 필터링할 수 있다.

**연관 시나리오**
§1.4 셀럽 착용 신발 탐색

**Query 파라미터**

| 파라미터명 | 타입 | 허용값 | 필수 | 설명 |
|---|---|---|---|---|
| `celeb_type` | string | `actor` / `athlete` / `influencer` / `youtuber` | - | 셀럽 유형 필터 |

**Request**
```
GET /api/celebs?celeb_type=athlete
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "celebs": [
    {
      "celeb_id": "celeb_001",
      "celeb_name": "홍길동",
      "celeb_type": "athlete",
      "celeb_image_url": "https://..."
    }
  ]
}
```

*조건 없음 (200 OK)*
```json
{
  "status": "no_match",
  "message": "해당 유형의 셀럽 데이터가 없습니다.",
  "celebs": []
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.7 [GET] `/api/celebs/:celeb_id` — v2.0

**설명**
특정 셀럽이 착용한 신발 목록을 반환한다. `goods_no` 기준으로 `Shoes` 시트와 논리적 조인하여 신발 상세 정보를 함께 제공한다.

**연관 시나리오**
§1.4 셀럽 착용 신발 탐색

**Path 파라미터**

| 파라미터명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `celeb_id` | string | ✅ | 셀럽 고유 ID (예: `celeb_001`) |

**Request**
```
GET /api/celebs/celeb_001
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "celeb": {
    "celeb_id": "celeb_001",
    "celeb_name": "홍길동",
    "celeb_type": "athlete",
    "celeb_image_url": "https://..."
  },
  "shoes": [
    {
      "goods_no": "4112233",
      "goods_name": "젤 카야노 31",
      "brand": "아식스",
      "price": 189000,
      "url": "https://www.musinsa.com/products/4112233",
      "thumbnail": "https://...",
      "source_url": "https://..."
    }
  ]
}
```

*조건 없음 (200 OK)*
```json
{
  "status": "no_match",
  "message": "해당 셀럽의 착용 신발 데이터가 없습니다.",
  "shoes": []
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.8 [POST] `/api/recommend/socks` — v2.0

**설명**
추천받은 신발의 주조색·포인트색을 기반으로 Claude API가 색상 이론에 따라 어울리는 양말 색상 3가지를 추천한다.

**연관 시나리오**
§1.6 양말 색상 추천

**Request Body 필드**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `goods_no` | string | ✅ | 신발 고유번호 |
| `main_color` | string | ✅ | 신발 주조색 (한국어 색상명, 예: "화이트") |
| `accent_color` | string | - | 신발 포인트색 (한국어 색상명) |

**Request**
```json
{
  "goods_no": "4112233",
  "main_color": "화이트",
  "accent_color": "블루"
}
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "socks": [
    { "color_name": "네이비", "hex_code": "#001F5B", "reason": "흰 신발과 보색 대비로 세련된 느낌을 연출합니다." },
    { "color_name": "라이트 그레이", "hex_code": "#D3D3D3", "reason": "무채색 계열로 화이트 신발과 자연스럽게 어울립니다." },
    { "color_name": "스카이 블루", "hex_code": "#87CEEB", "reason": "포인트 블루와 유사 색조로 통일감을 줍니다." }
  ]
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.9 [POST] `/api/size/convert` — v2.0

**설명**
현재 착용 중인 신발의 브랜드·모델·사이즈를 기준으로 다른 브랜드/모델의 권장 사이즈를 계산한다. 기본 변환은 `size_adjust_mm` 계산 로직으로 처리하며, `fit_note`는 선택적으로 Claude API를 활용한다.

**연관 시나리오**
§1.8 사이즈 핏 가이드

**Request Body 필드**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `from_brand` | string | ✅ | 현재 소유 신발 브랜드 (예: "아식스") |
| `from_model` | string | ✅ | 현재 모델명. `*` 입력 시 브랜드 기준값 사용 |
| `from_size_mm` | number | ✅ | 현재 착용 사이즈 (mm, 예: 260) |
| `to_brand` | string | ✅ | 변환하고 싶은 브랜드 |
| `to_model` | string | ✅ | 변환하고 싶은 모델명. `*` 입력 시 브랜드 기준값 사용 |

**Request**
```json
{
  "from_brand": "아식스",
  "from_model": "젤 카야노 31",
  "from_size_mm": 260,
  "to_brand": "뉴발란스",
  "to_model": "페이퍼 슈퍼컴프 엘리트 v4"
}
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "recommended_size_mm": 255,
  "confidence": "high",
  "fit_note": "페이퍼의 내부 공간이 여유롭게 설계되어 5mm 작은 사이즈가 더 잘 맞을 수 있습니다.",
  "width_note": "뉴발란스는 와이드 핏이 기본이므로 발볼이 좁은 분께는 별도 주의가 필요합니다."
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.10 [POST] `/api/recommend/outfit` — v2.0

**설명**
신발·양말 색상을 기반으로 Claude API가 상의·하의·모자 등 러닝 코디 아이템을 각 2~3가지 추천한다.

**연관 시나리오**
§1.7 러닝 코디 추천

**Request Body 필드**

| 필드명 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `goods_no` | string | ✅ | 신발 고유번호 |
| `main_color` | string | ✅ | 신발 주조색 (한국어 색상명) |
| `accent_color` | string | - | 신발 포인트색 (한국어 색상명) |
| `sock_color` | string | ✅ | 선택된 양말 색상 (한국어 색상명) |

**Request**
```json
{
  "goods_no": "4112233",
  "main_color": "화이트",
  "accent_color": "블루",
  "sock_color": "네이비"
}
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "outfit": [
    {
      "item": "상의",
      "suggestions": [
        { "color_name": "화이트", "hex_code": "#FFFFFF", "reason": "신발과 동색 계열로 깔끔한 올화이트 룩 연출" },
        { "color_name": "라이트 그레이", "hex_code": "#D3D3D3", "reason": "무채색 계열로 차분하게 어울림" }
      ]
    },
    {
      "item": "하의",
      "suggestions": [
        { "color_name": "네이비", "hex_code": "#001F5B", "reason": "양말과 동일 계열로 하의와 통일감 형성" }
      ]
    },
    {
      "item": "모자",
      "suggestions": [
        { "color_name": "블랙", "hex_code": "#000000", "reason": "어떤 조합에도 무난하게 포인트 역할" }
      ]
    }
  ]
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

#### 6.11 [GET] `/api/shoes` — v2.0

**설명**
Shoes DB 전체 목록을 반환한다. 브랜드 필터 및 키워드 부분 검색을 지원하며, §5.9 교체 계산기와 §5.10 사이즈 핏 가이드의 자동완성 드롭다운에서 활용한다.

**연관 시나리오**
§1.5 러닝화 교체 시기 계산기, §1.8 사이즈 핏 가이드

**Query 파라미터**

| 파라미터명 | 타입 | 허용값 | 필수 | 설명 |
|---|---|---|---|---|
| `brand` | string | 브랜드명 (예: "아식스") | - | 특정 브랜드 필터 |
| `keyword` | string | 모델명 부분 검색어 | - | `goods_name` 부분 일치 검색 |

**Request**
```
GET /api/shoes?brand=아식스&keyword=카야노
```

*정상 (200 OK)*
```json
{
  "status": "success",
  "shoes": [
    {
      "goods_no": "4112233",
      "goods_name": "젤 카야노 31",
      "brand": "아식스",
      "has_carbon_plate": false,
      "lifespan_km_min": 600,
      "lifespan_km_max": 800
    }
  ]
}
```

*조건 없음 (200 OK)*
```json
{
  "status": "no_match",
  "message": "검색 조건에 맞는 신발이 없습니다.",
  "shoes": []
}
```

*오류 (4xx/5xx)*
```json
{ "status": "error", "message": "오류 메시지" }
```

---

### 7. 데이터 구조 (Google Sheets 기반 DB & ERD)

Google Sheets를 DB로 사용하므로, 각 탭(Sheet)을 하나의 Table로 간주하여 평면화(Denormalization)된 구조를 가져갑니다.

> **DB 스키마 동기화 정책 — §7이 단일 진실 소스(Single Source of Truth)**
>
> | 역할 | 파일 | 명령 |
> |------|------|------|
> | 시트 생성 / 컬럼 추가 | `backend/db/ddl.js` | `npm run db:ddl` (개발) · `npm run db:ddl -- --prod` (상용) |
> | 샘플 데이터 삽입 | `backend/db/dml.js` | `npm run db:dml` (개발) · `npm run db:dml -- --prod` (상용) |
>
> **ERD 변경 시 필수 동기화 절차:**
> 1. 이 §7 테이블에 컬럼/시트 추가·변경
> 2. `ddl.js` 하단 `SCHEMA` 객체의 해당 배열 업데이트
> 3. `dml.js` 하단 `SCHEMA` 객체 + 샘플 데이터 배열 업데이트
> 4. `npm run db:ddl` 실행 → 새 컬럼 자동 추가 (기존 데이터 무손실)

#### 7.0 ERD — 엔티티 관계 정의

| 엔티티 | 관계 | 엔티티 | 설명 |
|---|---|---|---|
| `Logs` | 1 : N (논리적 참조) | `Shoes` | 하나의 로그에 여러 추천 신발 포함 가능 |
| `Celebs` | N : 1 (논리적 참조) | `Shoes` | `goods_no` 기준 조인. M:N 구조는 행 분리로 표현 |
| `RaceWinners` | N : 1 (논리적 참조) | `Shoes` | `goods_no` 기준 조인 |
| `Races` | 독립 | — | 대회 코스 정보. `/api/recommend/race`에서 직접 활용 |
| `SizeGuide` | 독립 | — | 브랜드/모델별 사이즈 가이드. `/api/size/convert`에서 직접 활용 |

> Google Sheets 환경이므로 물리적 FK 제약조건은 없으나, 애플리케이션 레벨에서 `goods_no` 기준으로 논리적 조인을 수행함

---

#### 7.1 Sheet 1: `Shoes` (러닝화 메타 데이터)

| Column Name | Type | Key | 버전 | 허용값 | Description |
|---|---|---|---|---|---|
| `goods_no` | String | PK | v1.0 | 무신사 상품번호 | 고유 식별자 |
| `goods_name` | String | | v1.0 | | 모델명 |
| `brand` | String | | v1.0 | | 브랜드명 |
| `price` | Number | | v1.0 | 정수 | 판매가 (원) |
| `url` | String | | v1.0 | URL | 무신사 상품 링크 |
| `thumbnail` | String | | v1.0 | URL | 상품 썸네일 이미지 URL |
| `width` | String | | v1.0 | `넓음` / `보통` / `좁음` | 발볼 너비 |
| `cushion` | Number | | v1.0 | 1~5 정수 | 쿠션감 (1=딱딱, 5=물렁) |
| `weight` | Number | | v1.0 | 1~5 정수 | 무게감 (1=가벼움, 5=무거움) |
| `distance` | String | | v1.0 | `단거리` / `중거리` / `장거리` / `전거리` | 적합 러닝 거리 |
| `breathability` | Number | | v1.0 | 1~5 정수 | 통기성 |
| `fit` | Number | | v1.0 | 1~5 정수 | 착화감 |
| `summary` | String | | v1.0 | | 리뷰 기반 한줄 요약 |
| `review_count_used` | Number | | v1.0 | 정수 | 분석에 사용된 리뷰 수 |
| `confidence` | String | | v1.0 | `high` / `medium` / `low` | 데이터 신뢰도 |
| `main_color` | String | | **v2.0** | 한국어 색상명 | 신발 주조색 (§5.5, §5.6) |
| `accent_color` | String | | **v2.0** | 한국어 색상명 | 포인트 색상 (§5.5, §5.6) |
| `lifespan_km_min` | Number | | **v2.0** | 정수 | 최소 권장 수명 (km, §5.9) |
| `lifespan_km_max` | Number | | **v2.0** | 정수 | 최대 권장 수명 (km, §5.9) |
| `has_carbon_plate` | Boolean | | **v2.0** | `true` / `false` | 카본 플레이트 유무. 카본화 수명(300~500km)은 일반 쿠션화(500~800km)와 별도 계산 (§5.9) |

---

#### 7.2 Sheet 2: `Logs` (사용자 이용 이력)

| Column Name | Type | Key | 버전 | 허용값 | Description |
|---|---|---|---|---|---|
| `log_id` | String | PK | v1.0 | UUID | 이력 고유 ID (자동생성) |
| `timestamp` | DateTime | | v1.0 | `YYYY-MM-DD HH:mm:ss` | 조회 일시 |
| `running_distance` | String | | v1.0 | `short` / `medium` / `long` / `marathon` | 달리는 거리 |
| `frequency` | String | | v1.0 | `casual` / `regular` / `intensive` | 러닝 빈도 |
| `foot_width` | String | | v1.0 | `wide` / `normal` / `narrow` | 발볼 너비 |
| `preferred_cushion` | Number | | v1.0 | 1~5 정수 | 선호 쿠션감 |
| `priorities` | String | | v1.0 | 콤마 구분 문자열 | 중요 요소 |
| `budget` | String | | v1.0 | `low` / `mid` / `high` / `premium` | 예산 범위 |
| `free_text` | String | | v1.0 | 최대 200자 | 자유 서술 내용 |
| `recommended_goods_no` | String | FK→Shoes | v1.0 | 콤마 구분 문자열 | 추천된 goods_no 목록 |

---

#### 7.3 Sheet 3: `Celebs` (셀럽 착용 신발) — v2.0 신규

| Column Name | Type | Key | 허용값 | Description |
|---|---|---|---|---|
| `celeb_id` | String | PK | | 고유 식별자 (예: `celeb_001`) |
| `celeb_name` | String | | | 셀럽 이름 |
| `celeb_type` | String | | `actor` / `athlete` / `influencer` / `youtuber` | 셀럽 유형 |
| `celeb_image_url` | String | | URL | 셀럽 이미지 URL |
| `goods_no` | String | FK→Shoes | | 착용 신발 고유번호 |
| `source_url` | String | | URL | 근거 기사·인스타 링크 |

> M:N 처리: 셀럽 1명이 여러 신발을 착용하는 경우 각 신발마다 행을 분리하여 관리한다.

---

#### 7.4 Sheet 4: `RaceWinners` (대회 우승자 착용 신발) — v2.0 신규

| Column Name | Type | Key | 허용값 | Description |
|---|---|---|---|---|
| `winner_id` | String | PK | | 고유 식별자 (예: `winner_001`) |
| `race_name` | String | | | 대회명 |
| `race_year` | Number | | 정수 | 개최 연도 |
| `winner_name` | String | | | 우승자 이름 |
| `winner_nationality` | String | | | 국적 |
| `course_type` | String | | `half` / `full` | 코스 구분 |
| `result_time` | String | | `H:MM:SS` | 기록 |
| `goods_no` | String | FK→Shoes | | 착용 신발 고유번호 |
| `source_url` | String | | URL | 근거 기사 링크 |

---

#### 7.5 Sheet 5: `Races` (대회 코스 정보) — v2.0 신규

| Column Name | Type | Key | 허용값 | Description |
|---|---|---|---|---|
| `race_id` | String | PK | | 고유 식별자 (예: `jtbc_half`) |
| `race_name` | String | | | 대회명 |
| `country` | String | | 국가 코드 | 예: `KR`, `DE`, `JP` |
| `city` | String | | | 도시명 |
| `course_type` | String | | `half` / `full` | 코스 구분 |
| `typical_month` | Number | | 1~12 정수 | 통상 개최월 |
| `avg_temp_celsius` | Number | | 정수 | 대회 시즌 평균 기온 (℃) |
| `surface_type` | String | | `asphalt` / `mixed` / `trail` | 노면 유형 |
| `elevation_gain_m` | Number | | 정수 | 누적 고도 상승 (m) |
| `difficulty` | Number | | 1~5 정수 | 코스 난이도 |
| `course_summary` | String | | | 코스 핵심 특징 요약 |
| `shoe_priority_hint` | String | | | 추천 시 우선 고려 키워드 (예: `쿠션, 안정성, 경량`) |
| `is_world_major` | Boolean | | `true` / `false` | 세계 6대 메이저 여부 |
| `is_active` | Boolean | | `true` / `false` | 대회 활성화 여부 (취소·폐지 대응) |

---

#### 7.6 Sheet 6: `SizeGuide` (브랜드별 사이즈 가이드) — v2.0 신규

| Column Name | Type | Key | 허용값 | Description |
|---|---|---|---|---|
| `size_guide_id` | String | PK | | 고유 식별자 (예: `sg_001`) |
| `brand` | String | | | 브랜드명 |
| `model_name` | String | | | 모델명 (`*` = 브랜드 전체 경향 기준값) |
| `sizing_tendency` | String | | `small` / `true` / `large` | 사이즈 경향 |
| `width_tendency` | String | | `narrow` / `normal` / `wide` | 발볼 경향 |
| `size_adjust_mm` | Number | | 정수 (음수 가능) | 아식스 기준 대비 조정값 (mm) |
| `fit_note` | String | | | 핏 관련 특이사항 |

---

### 8. 서비스 흐름도 (Call Flow)

> **표기 규칙:**
> - `FE` = 모바일 웹 (프론트엔드)
> - `BE` = Node.js API (백엔드)
> - `Sheets` = Google Sheets DB
> - `Claude` = Anthropic Claude API
> - 번호 ①②③... = 단계 순서

---

#### 8.1 AI 러닝화 추천 — §1.2 대응

```
FE                    BE                    Sheets               Claude
│                     │                     │                     │
│──① POST ───────────►│                     │                     │
│  /api/recommend     │                     │                     │
│  {user_profile}     │                     │                     │
│                     │──② getRows()───────►│                     │
│                     │  [Shoes Sheet]       │                     │
│                     │◄──③ rows[]──────────│                     │
│                     │                     │                     │
│                     │  ④ 1차 필터링       │                     │
│                     │  (예산·발볼 기준)    │                     │
│                     │                     │                     │
│                     │──⑤ prompt + ───────────────────────────►│
│                     │  후보 목록           │                     │
│                     │◄──⑥ 최종 5개 + ────────────────────────│
│                     │  맞춤형 추천 사유    │                     │
│                     │                     │                     │
│                     │──⑦ appendRow()─────►│                     │
│                     │  [Logs, 비동기]      │                     │
│                     │                     │                     │
│◄──⑧ 추천 결과──────│                     │                     │
│  JSON (최대 5개)     │                     │                     │
│                     │                     │                     │
│  ⑨ 결과 카드 렌더링  │                     │                     │
│  + 비교 모달 버튼    │                     │                     │
```

---

#### 8.2 대회 코스 기반 러닝화 추천 — §1.3 대응

```
FE                    BE                    Sheets               Claude
│                     │                     │                     │
│──① GET /api/races──►│                     │                     │
│  ?country=KR        │                     │                     │
│                     │──② getRows()───────►│                     │
│                     │  [Races Sheet]       │                     │
│                     │◄──③ races[]─────────│                     │
│◄──④ 대회 목록───────│                     │                     │
│                     │                     │                     │
│  ⑤ 대회·코스 선택   │                     │                     │
│                     │                     │                     │
│──⑥ POST ───────────►│                     │                     │
│  /api/recommend/    │                     │                     │
│  race               │                     │                     │
│  {race_id,          │                     │                     │
│   course_type,      │                     │                     │
│   user_profile?}    │                     │                     │
│                     │──⑦ getRows()───────►│                     │
│                     │  [Races + Shoes]     │                     │
│                     │◄──⑧ data[]──────────│                     │
│                     │                     │                     │
│                     │──⑨ prompt + ───────────────────────────►│
│                     │  코스 특성 + 후보    │                     │
│                     │◄──⑩ 최종 5개 + ────────────────────────│
│                     │  추천 사유           │                     │
│◄──⑪ 추천 결과──────│                     │                     │
│  (race 정보 포함)    │                     │                     │
```

---

#### 8.3 셀럽 착용 신발 탐색 — §1.4 (셀럽 탭) 대응

```
FE                    BE                    Sheets
│                     │                     │
│──① GET /api/celebs─►│                     │
│  ?celeb_type=athlete │                     │
│                     │──② getRows()───────►│
│                     │  [Celebs Sheet]      │
│                     │◄──③ celebs[]────────│
│◄──④ 셀럽 목록───────│                     │
│                     │                     │
│  ⑤ 셀럽 선택        │                     │
│                     │                     │
│──⑥ GET ────────────►│                     │
│  /api/celebs/       │                     │
│  :celeb_id          │                     │
│                     │──⑦ getRows()───────►│
│                     │  [Celebs + Shoes     │
│                     │   논리적 조인]        │
│                     │◄──⑧ joined data[]───│
│◄──⑨ 착용 신발 목록──│                     │
```

---

#### 8.4 우승자 착용 신발 탐색 — §1.4 (우승자 탭) 대응

```
FE                    BE                    Sheets
│                     │                     │
│──① GET ────────────►│                     │
│  /api/race-winners  │                     │
│  ?race_name=베를린  │                     │
│  &race_year=2023    │                     │
│                     │──② getRows()───────►│
│                     │  [RaceWinners Sheet] │
│                     │◄──③ winners[]───────│
│◄──④ 우승자 목록─────│                     │
│  (착용 goods_no 포함)│                     │
│                     │                     │
│  ⑤ 우승자 선택 →    │                     │
│  goods_no로 Shoes   │                     │
│  정보 UI 렌더링      │                     │
```

---

#### 8.5 러닝화 교체 시기 계산기 — §1.5 대응

```
FE                    BE                    Sheets
│                     │                     │
│──① GET /api/shoes──►│                     │
│  ?keyword=검색어    │                     │
│  (자동완성용)        │                     │
│                     │──② getRows()───────►│
│                     │  [Shoes Sheet]       │
│                     │◄──③ rows[]──────────│
│◄──④ 신발 목록───────│                     │
│                     │                     │
│  ⑤ 신발·구매월·     │                     │
│    거리 정보 입력    │                     │
│                     │                     │
│──⑥ POST ───────────►│                     │
│  /api/shoes/lifespan│                     │
│  {goods_no,         │                     │
│   purchase_year_    │                     │
│   month, weekly_km} │                     │
│                     │──⑦ getRow()────────►│
│                     │  goods_no 기준       │
│                     │◄──⑧ shoe data───────│
│                     │                     │
│                     │  ⑨ 수명 계산 로직   │
│                     │  (usage_rate,        │
│                     │   verdict 산출)      │
│◄──⑩ 판정 결과──────│                     │
│  {verdict, message, │                     │
│   remaining_km}     │                     │
```

> Claude API를 사용하지 않는 순수 계산 플로우.

---

#### 8.6 양말 색상 추천 — §1.6 대응

```
FE                    BE                                          Claude
│                     │                                           │
│  ① 추천 결과 카드에서│                                           │
│  main_color,        │                                           │
│  accent_color 확인  │                                           │
│                     │                                           │
│──② POST ───────────►│                                           │
│  /api/recommend/    │                                           │
│  socks              │                                           │
│  {goods_no,         │                                           │
│   main_color,       │                                           │
│   accent_color}     │                                           │
│                     │──③ prompt + ───────────────────────────►│
│                     │  색상 데이터          │                    │
│                     │◄──④ 양말 색상 3가지 ──────────────────────│
│                     │  {color_name,         │                   │
│                     │   hex_code, reason}   │                   │
│◄──⑤ 양말 색상 추천──│                                           │
```

---

#### 8.7 러닝 코디 추천 — §1.7 대응

```
FE                    BE                                          Claude
│                     │                                           │
│  ① §8.6에서 양말    │                                           │
│  색상 선택 완료      │                                           │
│                     │                                           │
│──② POST ───────────►│                                           │
│  /api/recommend/    │                                           │
│  outfit             │                                           │
│  {goods_no,         │                                           │
│   main_color,       │                                           │
│   accent_color,     │                                           │
│   sock_color}       │                                           │
│                     │──③ prompt + ───────────────────────────►│
│                     │  신발+양말 색상 데이터│                    │
│                     │◄──④ 상의·하의·모자 ───────────────────────│
│                     │  코디 추천 결과       │                    │
│◄──⑤ 코디 추천──────│                                           │
│  (color+reason 포함) │                                           │
```

> Sheets DB 조회 없이 BE → Claude 직통 플로우.

---

#### 8.8 사이즈 핏 가이드 — §1.8 대응

```
FE                    BE                    Sheets               Claude
│                     │                     │                     │
│──① GET /api/shoes──►│                     │                     │
│  ?brand=아식스      │                     │                     │
│  (자동완성용)        │                     │                     │
│                     │──② getRows()───────►│                     │
│                     │  [Shoes Sheet]       │                     │
│                     │◄──③ rows[]──────────│                     │
│◄──④ 신발 목록───────│                     │                     │
│                     │                     │                     │
│  ⑤ 현재·변환 신발   │                     │                     │
│  브랜드·모델·사이즈  │                     │                     │
│  입력                │                     │                     │
│                     │                     │                     │
│──⑥ POST ───────────►│                     │                     │
│  /api/size/convert  │                     │                     │
│  {from_brand,       │                     │                     │
│   from_model,       │                     │                     │
│   from_size_mm,     │                     │                     │
│   to_brand,         │                     │                     │
│   to_model}         │                     │                     │
│                     │──⑦ getRows()───────►│                     │
│                     │  [SizeGuide Sheet]   │                     │
│                     │◄──⑧ guide data[]────│                     │
│                     │                     │                     │
│                     │  ⑨ size_adjust_mm   │                     │
│                     │  계산 로직           │                     │
│                     │                     │                     │
│                     │──⑩ fit_note 생성────────────────────────►│
│                     │  (선택적)            │                     │
│                     │◄──⑪ fit_note ──────────────────────────│
│◄──⑫ 변환 결과──────│                     │                     │
│  {size_mm,          │                     │                     │
│   fit_note,         │                     │                     │
│   width_note}       │                     │                     │
```

> ⑩~⑪ Claude 호출은 선택적(fit_note 생성 시에만). 기본 사이즈 변환은 계산 로직만으로 처리.

---

#### 8.9 Fallback 처리 (Claude API 장애 시)

```
FE                    BE                    Sheets               Claude
│                     │                     │                     │
│──① API 요청─────────►│                     │                     │
│  (추천 관련)         │                     │                     │
│                     │──② Claude 호출──────────────────────────►│
│                     │                     │                     │
│                     │  ③ 5초 경과 Timeout │                     │
│                     │  → Fallback 가동     │                     │
│                     │                     │                     │
│                     │──④ getRows()───────►│                     │
│                     │  [Shoes: Fallback    │                     │
│                     │   베스트셀러 목록]    │                     │
│                     │◄──⑤ fallback rows───│                     │
│                     │                     │                     │
│◄──⑥ 추천 결과──────│                     │                     │
│  {is_fallback: true} │                     │                     │
│  안정성 위주 고정 추천│                     │                     │
```

> Timeout 기준: **5초**. Fallback 데이터: 하드코딩된 안정성 위주 베스트셀러 목록 (브룩스 아드레날린, 아식스 카야노 등). FE는 `is_fallback: true` 수신 시 "AI 추천을 불러오지 못했습니다. 인기 신발을 대신 보여드립니다." 배너를 표시한다.
