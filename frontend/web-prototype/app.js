/**
 * RunFit 진단 페이지 메인 로직
 * index.html에서 사용
 */

// ============================================================
// 1. UI 이벤트 처리
// ============================================================

// 라디오/체크박스 클릭 시 스타일 업데이트
document.querySelectorAll('.option-btn input').forEach((input) => {
  input.addEventListener('change', () => {
    const name = input.name;
    if (input.type === 'radio') {
      document
        .querySelectorAll(`.option-btn input[name="${name}"]`)
        .forEach((el) => el.closest('.option-btn').classList.remove('selected'));
      input.closest('.option-btn').classList.add('selected');
    } else {
      // checkbox
      input.closest('.option-btn').classList.toggle('selected', input.checked);
      enforceMaxPriorities();
    }
  });
});

// Q5 최대 3개 제한
function enforceMaxPriorities() {
  const checked = document.querySelectorAll('input[name="priorities"]:checked');
  if (checked.length > 3) {
    // 마지막 체크 해제
    const last = checked[checked.length - 1];
    last.checked = false;
    last.closest('.option-btn').classList.remove('selected');
    showInlineWarning('중요 요소는 최대 3개까지 선택 가능합니다.');
  }
}

function showInlineWarning(msg) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

// Q4 슬라이더 값 업데이트
const cushionLabels = ['', '매우 딱딱', '약간 딱딱', '중간', '약간 물렁', '매우 물렁'];
const slider = document.getElementById('cushion-slider');
const cushionValue = document.getElementById('cushion-value');
slider.addEventListener('input', () => {
  cushionValue.textContent = `${slider.value} (${cushionLabels[slider.value]})`;
});

// Q7 글자수 카운팅
const freeText = document.getElementById('free-text');
const charCount = document.getElementById('char-count');
freeText.addEventListener('input', () => {
  charCount.textContent = freeText.value.length;
});

// 기본값 선택사항 스타일 반영 (Q2 regular)
document.querySelectorAll('.option-btn input:checked').forEach((input) => {
  input.closest('.option-btn').classList.add('selected');
});

// 필수 아닌 라디오 그룹: 이미 선택된 항목 재클릭 시 비선택
// mousedown을 input이 아닌 label(.option-btn)에 붙여야 함:
// 라벨 클릭 시 mousedown은 라벨에 발생하고 input에는 전달되지 않기 때문
const OPTIONAL_RADIO_GROUPS = ['frequency', 'foot_shape', 'budget'];
OPTIONAL_RADIO_GROUPS.forEach((name) => {
  document.querySelectorAll(`input[type="radio"][name="${name}"]`).forEach((input) => {
    const label = input.closest('.option-btn');
    label.addEventListener('mousedown', function () {
      // 라벨 mousedown 시점에서 연결된 input의 checked 상태 스냅샷
      input._wasChecked = input.checked;
    });
    input.addEventListener('click', function () {
      if (this._wasChecked) {
        // 이미 선택된 상태에서 재클릭 → 비선택
        this.checked = false;
        label.classList.remove('selected');
      }
    });
  });
});

// ============================================================
// 2. 폼 데이터 수집
// ============================================================
function collectFormData() {
  return {
    running_distance:
      document.querySelector('input[name="distance"]:checked')?.value || null,
    frequency:
      document.querySelector('input[name="frequency"]:checked')?.value || 'regular',
    foot_width:
      document.querySelector('input[name="width"]:checked')?.value || null,
    // v2.7: 족형(발 모양 유형) — 선택 항목, 미선택 시 null 전달, 백엔드에서 무시
    foot_shape:
      document.querySelector('input[name="foot_shape"]:checked')?.value || null,
    preferred_cushion:
      parseInt(document.getElementById('cushion-slider').value) || 3,
    priorities: Array.from(
      document.querySelectorAll('input[name="priorities"]:checked')
    ).map((el) => el.value),
    budget:
      document.querySelector('input[name="budget"]:checked')?.value || 'any',
    free_text: document.getElementById('free-text').value.trim(),
  };
}

// ============================================================
// 3. 유효성 검증
// ============================================================
function validateForm(profile) {
  const errors = [];
  if (!profile.running_distance) errors.push("Q1 '달리는 거리'를 선택해 주세요.");
  if (!profile.foot_width) errors.push("Q3 '발볼 유형'을 선택해 주세요.");
  if (profile.priorities.length > 3)
    errors.push("Q5 '중요 요소'는 최대 3개까지 선택 가능합니다.");
  if (profile.free_text.length > 200)
    errors.push('Q7 추가 내용은 200자 이내로 입력해 주세요.');
  return errors;
}

function showErrors(errors) {
  const el = document.getElementById('errors');
  el.innerHTML = '<strong>입력 확인 필요</strong><ul>' +
    errors.map((e) => `<li>${e}</li>`).join('') + '</ul>';
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideErrors() {
  document.getElementById('errors').style.display = 'none';
}

// ============================================================
// 4. 제출
// ============================================================
const submitBtn = document.getElementById('submit-btn');
const form = document.getElementById('diagnosis-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideErrors();

  // 중복 제출 방지
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  submitBtn.textContent = '진단 중..';

  const profile = collectFormData();
  const errors = validateForm(profile);

  if (errors.length > 0) {
    showErrors(errors);
    submitBtn.disabled = false;
    submitBtn.textContent = '추천 받기 →';
    return;
  }

  // 사용자 프로필 저장 후 즉시 결과 페이지로 이동
  // (결과 페이지 자체 로딩 오버레이가 Phase 1 동안 표시됨)
  sessionStorage.setItem('user_profile', JSON.stringify(profile));
  window.location.href = 'result.html';
});
