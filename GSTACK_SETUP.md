# gstack 로컬 설치 가이드

## 개요

- `ai-evolution-team6` — 팀 공용 프로젝트 소스 (git 형상관리)
- `gstack` — 각자 로컬에 설치하는 Claude Code 스킬 모음 (프로젝트 repo에 포함 안 됨)

프로젝트에서 `/office-hours`, `/review` 등 스킬 명령어를 사용하려면, gstack을 본인 로컬 머신에 설치해야 합니다.

---

## 설치 순서

### 1단계: gstack 클론

자신의 로컬 머신 어디든 편한 위치에 클론합니다.

```bash
# 예시: 홈 디렉토리에 설치
git clone https://github.com/garrytan/gstack.git ~/gstack
```

Windows의 경우:
```powershell
git clone https://github.com/garrytan/gstack.git $env:USERPROFILE\gstack
```

---

### 2단계: 스킬을 글로벌 Claude 디렉토리에 복사

Claude Code는 `~/.claude/skills/` 폴더를 자동으로 인식합니다.  
아래 명령으로 gstack 스킬들을 글로벌 위치에 복사합니다.

**Mac/Linux:**
```bash
mkdir -p ~/.claude/skills

# 사용할 스킬 복사 (프로젝트 CLAUDE.md 기준)
for skill in \
  office-hours plan-ceo-review plan-eng-review \
  plan-design-review plan-devex-review \
  review design-consultation design-shotgun design-html \
  qa cso ship land-and-deploy canary \
  browse investigate retro learn careful freeze; do
    cp -r ~/gstack/$skill ~/.claude/skills/
done
```

**Windows (PowerShell):**
```powershell
$skillsDir = "$env:USERPROFILE\.claude\skills"
New-Item -ItemType Directory -Force -Path $skillsDir

$skills = @(
  "office-hours", "plan-ceo-review", "plan-eng-review",
  "plan-design-review", "plan-devex-review",
  "review", "design-consultation", "design-shotgun", "design-html",
  "qa", "cso", "ship", "land-and-deploy", "canary",
  "browse", "investigate", "retro", "learn", "careful", "freeze"
)

foreach ($skill in $skills) {
  Copy-Item -Recurse "$env:USERPROFILE\gstack\$skill" "$skillsDir\" -Force
}
```

---

### 3단계: 동작 확인

VSCode Chat 창에서 아래 명령 입력:

```
/office-hours
```

스킬이 응답하면 설치 성공입니다.

---

## gstack 업데이트 방법

gstack에 새 스킬이 추가되거나 업데이트될 때:

```bash
# gstack 최신화
cd ~/gstack && git pull

# 스킬 재복사 (위 2단계 명령 재실행)
```

---

## 설치 구조 요약

```
로컬 머신
├── ~/gstack/                    ← gstack repo (본인이 직접 클론)
│   ├── office-hours/
│   ├── plan-ceo-review/
│   └── ...
│
├── ~/.claude/skills/            ← Claude Code 글로벌 스킬 디렉토리
│   ├── office-hours/            ← gstack에서 복사됨
│   ├── plan-ceo-review/
│   └── ...
│
└── [작업폴더]/ai-evolution-team6/ ← 프로젝트 repo (git clone)
    └── .claude/
        └── skills/              ← 비어있음 (gstack 파일 없음)
```

---

## 사용 가능한 스킬 목록

| 명령어 | 설명 |
|--------|------|
| `/office-hours` | 제품 기획 (YC 스타일 6가지 질문) |
| `/plan-ceo-review` | CEO/창업자 관점 전략 검토 |
| `/plan-eng-review` | 엔지니어링 아키텍처 검토 |
| `/plan-design-review` | 시니어 디자이너 설계 검토 |
| `/plan-devex-review` | 개발자 경험 검토 |
| `/review` | 스태프 엔지니어 코드 리뷰 |
| `/design-consultation` | 디자인 시스템 구축 |
| `/design-shotgun` | 디자인 탐색 |
| `/design-html` | 설계도 → 프로덕션 HTML 변환 |
| `/qa` | QA 테스트 (실제 브라우저) |
| `/cso` | 보안 감시 (OWASP Top 10) |
| `/ship` | 배포 자동화 |
| `/land-and-deploy` | 머지 → 프로덕션 배포 |
| `/canary` | 배포 후 모니터링 |
| `/browse` | 실제 Chromium 브라우저 |
| `/investigate` | 근본 원인 분석 |
| `/retro` | 팀 회고 |
| `/learn` | 학습 저장소 관리 |
| `/careful` | 파괴적 명령 실행 전 경고 |
| `/freeze` | 특정 디렉토리만 편집 |

---

## 문제 해결

| 증상 | 해결 |
|------|------|
| `/office-hours` 입력해도 반응 없음 | `~/.claude/skills/office-hours/` 폴더 존재 여부 확인 |
| 스킬 목록이 보이지 않음 | VSCode 재시작 후 재시도 |
| Windows에서 복사 실패 | PowerShell을 관리자 권한으로 실행 |
