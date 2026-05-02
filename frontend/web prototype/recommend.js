/**
 * RunFit ??異붿쿇 留ㅼ묶 ?붿쭊
 * ?쒖닔 JS, 諛깆뿏???놁씠 ?숈옉 (GitHub Pages ?명솚)
 */

const WIDTH_MAP = { wide: '?볦쓬', normal: '蹂댄넻', narrow: '醫곸쓬' };
const DISTANCE_MAP = {
  short: '?④굅由?,
  medium: '以묎굅由?,
  long: '?κ굅由?,
  marathon: '?κ굅由?,
};
const BUDGET_MAX = {
  low: 70000,
  mid: 120000,
  high: 200000,
  premium: Infinity,
};

/**
 * ?ъ슜???꾨줈??+ ?좊컻 ?띿꽦 ??留ㅼ묶 ?먯닔 (0-100)
 *
 * 媛以묒튂:
 *   width    ??40??(媛??以묒슂)
 *   cushion  ??30?? *   distance ??20?? *   budget   ??10?? */
function calculateMatchScore(user, shoe) {
  let score = 0;

  // ?? 諛쒕낵 (40?? ??
  // CEO Critical Fix #5: narrow foot + ?볦쓬 ?좊컻?먮룄 ?섎꼸??(?移?
  const userWidth = WIDTH_MAP[user.foot_width];
  if (shoe.width === userWidth) {
    score += 40;
  } else if (shoe.width === '蹂댄넻') {
    score += 20;
  } else if (user.foot_width === 'wide' && shoe.width === '醫곸쓬') {
    score -= 20; // 諛쒕낵 ?볦???醫곸? ?좊컻 ???섎꼸??  } else if (user.foot_width === 'narrow' && shoe.width === '?볦쓬') {
    score -= 20; // 諛쒕낵 醫곸????볦? ?좊컻 ???섎꼸??(?移?
  }

  // ?? 荑좎뀡 (30?? ??
  const userCushion = user.preferred_cushion ?? 3;
  const shoeCushion = shoe.cushion ?? 3;
  const cushionDiff = Math.abs(shoeCushion - userCushion);
  score += Math.max(0, 30 - cushionDiff * 10);

  // ?? 嫄곕━ (20?? ??
  const userDist = DISTANCE_MAP[user.running_distance];
  if (shoe.distance === userDist) {
    score += 20;
  } else if (shoe.distance === '?꾧굅由?) {
    score += 15;
  }

  // ?? ?덉궛 (10?? ??
  const budgetCap = BUDGET_MAX[user.budget] ?? Infinity;
  const price = parseInt(shoe.price) || 0;
  if (price <= budgetCap) score += 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * ?곗꽑?쒖쐞(priorities) 湲곕컲 蹂대꼫???먯닔
 * 理쒕? 3媛??곗꽑?쒖쐞 횞 5??= 15??異붽? 媛?? */
function priorityBonus(user, shoe) {
  let bonus = 0;
  for (const p of user.priorities || []) {
    if (p === 'speed' && (shoe.weight ?? 3) <= 2) bonus += 5;
    if (p === 'protection' && (shoe.cushion ?? 3) >= 4) bonus += 5;
    if (p === 'comfort' && (shoe.fit ?? 3) >= 4) bonus += 5;
    if (p === 'breathability' && (shoe.breathability ?? 3) >= 4) bonus += 5;
    // 'design'? ?곗씠?곕줈 ?됯? 遺덇?, 蹂대꼫???놁쓬
  }
  return bonus;
}

/**
 * 異붿쿇 ?댁쑀 ?쒓뎅???앹꽦
 */
function generateReason(user, shoe) {
  const reasons = [];
  const userWidth = WIDTH_MAP[user.foot_width];

  if (shoe.width === userWidth) {
    reasons.push(`${userWidth} 諛쒕낵????留욎쓬`);
  }

  const cushionDiff = Math.abs((shoe.cushion ?? 3) - (user.preferred_cushion ?? 3));
  if (cushionDiff <= 1) {
    reasons.push('?먰븯?쒕뒗 荑좎뀡媛먭낵 ?쇱튂');
  }

  const userDist = DISTANCE_MAP[user.running_distance];
  if (shoe.distance === userDist) {
    reasons.push(`${userDist} ?щ떇??理쒖쟻??);
  } else if (shoe.distance === '?꾧굅由?) {
    reasons.push('踰붿슜 ?곗씪由??몃젅?대꼫');
  }

  if (user.priorities?.includes('speed') && (shoe.weight ?? 3) <= 2) {
    reasons.push('媛踰쇱슫 臾닿쾶');
  }
  if (user.priorities?.includes('protection') && (shoe.cushion ?? 3) >= 4) {
    reasons.push('異⑸텇??荑좎뀡?쇰줈 遺??諛⑹?');
  }
  if (user.priorities?.includes('breathability') && (shoe.breathability ?? 3) >= 4) {
    reasons.push('?듦린???곗닔');
  }

  return reasons.length > 0 ? reasons.join(' 쨌 ') : '洹좏삎 ?≫엺 ?좏깮吏';
}

/**
 * 硫붿씤 異붿쿇 ?⑥닔
 * @param {object} userProfile - ???낅젰
 * @param {array} products - product_profiles.json 濡쒕뱶 寃곌낵
 * @returns {array} 留ㅼ묶 ?먯닔 ?대┝李⑥닚, ?곸쐞 5媛? */
function getRecommendations(userProfile, products) {
  const scored = products
    .map((shoe) => {
      const baseScore = calculateMatchScore(userProfile, shoe);
      const bonus = priorityBonus(userProfile, shoe);
      const total = Math.min(100, baseScore + bonus);
      return {
        ...shoe,
        match_score: total,
        reason: generateReason(userProfile, shoe),
      };
    })
    .sort((a, b) => b.match_score - a.match_score);

  return scored.slice(0, 5);
}
