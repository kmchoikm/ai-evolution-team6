## 🚀 gstack 설치 가이드

### 1단계: 프로젝트 클론
```bash
git clone https://github.com/yayana0205/ai-evolution-team6.git
cd ai-evolution-team6
```

### 2단계: gstack 글로벌 설치
```bash
# Mac/Linux
cp -r gstack ~/.claude/skills/gstack

# Windows
copy-item -Recurse gstack $env:USERPROFILE\.claude\skills\gstack
```

### 3단계: 심링크 생성
```bash
./setup --team
```

### 4단계: 테스트
VS Code Chat에서 `/office-hours` 입력!

### ❓ 문제 발생 시
- 심링크가 없으면: `./setup --team` 재실행
- gstack이 없으면: 글로벌 설치 경로 확인

### 📋 심링크 개념 설명
- **심링크(Symlink)**: 파일이나 폴더를 가상으로 연결하는 Windows NTFS 기능
- **목적**: 프로젝트 내에서 글로벌 gstack 폴더를 참조
- **장점**: 코드 중복 없이 하나의 gstack으로 모든 프로젝트 지원

### 🔧 수동 심링크 생성 (필요시)
```bash
# Windows (cmd)
mklink /D .claude\skills\office-hours ..\..\gstack\office-hours
mklink /D .claude\skills\review ..\..\gstack\review
mklink /D .claude\skills\plan-ceo-review ..\..\gstack\plan-ceo-review
# ... (나머지 스킬들)
```

### 📚 gstack 스킬 목록
- `/office-hours` - 제품 기획 (YC 스타일)
- `/plan-ceo-review` - CEO 관점 전략 검토
- `/plan-eng-review` - 엔지니어링 아키텍처 검토
- `/review` - 코드 리뷰
- `/qa` - QA 테스트
- `/ship` - 배포 자동화
- 기타 18개 스킬들...