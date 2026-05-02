/**
 * RunFit ??吏꾨떒 ??濡쒖쭅
 * index.html?먯꽌 ?ъ슜
 */

// ============================================================
// 1. UI ?명꽣?숈뀡
// ============================================================

// ?쇰뵒??泥댄겕諛뺤뒪 ?쒓컖 ?쇰뱶諛?document.querySelectorAll('.option-btn input').forEach((input) => {
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

// Q5 理쒕? 3媛??쒗븳
function enforceMaxPriorities() {
  const checked = document.querySelectorAll('input[name="priorities"]:checked');
  if (checked.length > 3) {
    // 留덉?留?泥댄겕 ?댁젣
    const last = checked[checked.length - 1];
    last.checked = false;
    last.closest('.option-btn').classList.remove('selected');
    showInlineWarning('以묒슂 ?붿냼??理쒕? 3媛쒓퉴吏 ?좏깮?????덉뼱??');
  }
}

function showInlineWarning(msg) {
  const div = document.createElement('div');
  div.className = 'toast';
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

// Q4 ?щ씪?대뜑 媛??쒖떆
const cushionLabels = ['', '留ㅼ슦 ?깅뵳', '?쎄컙 ?깅뵳', '以묎컙', '?쎄컙 臾쇰쟻', '留ㅼ슦 臾쇰쟻'];
const slider = document.getElementById('cushion-slider');
const cushionValue = document.getElementById('cushion-value');
slider.addEventListener('input', () => {
  cushionValue.textContent = `${slider.value} (${cushionLabels[slider.value]})`;
});

// Q7 湲?먯닔 移댁슫??const freeText = document.getElementById('free-text');
const charCount = document.getElementById('char-count');
freeText.addEventListener('input', () => {
  charCount.textContent = freeText.value.length;
});

// 湲곕낯 ?좏깮???쇰뵒???쒓컖 諛섏쁺 (Q2 regular)
document.querySelectorAll('.option-btn input:checked').forEach((input) => {
  input.closest('.option-btn').classList.add('selected');
});

// ============================================================
// 2. ???곗씠???섏쭛
// ============================================================
function collectFormData() {
  return {
    running_distance:
      document.querySelector('input[name="distance"]:checked')?.value || null,
    frequency:
      document.querySelector('input[name="frequency"]:checked')?.value || 'casual',
    foot_width:
      document.querySelector('input[name="width"]:checked')?.value || null,
    preferred_cushion:
      parseInt(document.getElementById('cushion-slider').value) || 3,
    priorities: Array.from(
      document.querySelectorAll('input[name="priorities"]:checked')
    ).map((el) => el.value),
    budget:
      document.querySelector('input[name="budget"]:checked')?.value || null,
    free_text: document.getElementById('free-text').value.trim(),
  };
}

// ============================================================
// 3. 寃利?// ============================================================
function validateForm(profile) {
  const errors = [];
  if (!profile.running_distance) errors.push("Q1 '?щ━??嫄곕━'瑜??좏깮??二쇱꽭??");
  if (!profile.foot_width) errors.push("Q3 '諛쒕낵 ?좏삎'???좏깮??二쇱꽭??");
  if (profile.priorities.length > 3)
    errors.push("Q5 '以묒슂 ?붿냼'??理쒕? 3媛쒓퉴吏 ?좏깮 媛?ν빀?덈떎.");
  if (profile.free_text.length > 200)
    errors.push('Q7 異붽? ?댁슜? 200???대궡濡??낅젰??二쇱꽭??');
  return errors;
}

function showErrors(errors) {
  const el = document.getElementById('errors');
  el.innerHTML = '<strong>?낅젰 ?뺤씤 ?꾩슂</strong><ul>' +
    errors.map((e) => `<li>${e}</li>`).join('') + '</ul>';
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideErrors() {
  document.getElementById('errors').style.display = 'none';
}

// ============================================================
// 4. ?쒖텧
// ============================================================
const submitBtn = document.getElementById('submit-btn');
const form = document.getElementById('diagnosis-form');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideErrors();

  // CEO Critical Fix #3: ?붾툝?대┃ 諛⑹?
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  submitBtn.textContent = '吏꾨떒 以?..';

  const profile = collectFormData();
  const errors = validateForm(profile);

  if (errors.length > 0) {
    showErrors(errors);
    submitBtn.disabled = false;
    submitBtn.textContent = '異붿쿇 諛쏄린 ??;
    return;
  }

  showLoading('AI媛 理쒖쟻???щ떇?붾? 李얘퀬 ?덉뼱??.. ?뵇');

  // ?ъ슜???꾨줈?????  sessionStorage.setItem('user_profile', JSON.stringify(profile));

  // ?쎄컙???쒕젅??(泥닿컧 UX) ??寃곌낵 ?섏씠吏濡?  setTimeout(() => {
    window.location.href = 'result.html';
  }, 800);
});

function showLoading(message) {
  const overlay = document.getElementById('loading-overlay');
  const msg = document.getElementById('loading-message');
  msg.textContent = message;
  overlay.style.display = 'flex';
}
