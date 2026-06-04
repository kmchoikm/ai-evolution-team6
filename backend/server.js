/**
 * RunFit 백엔드 API 서버 엔트리포인트
 * 앱 로직은 app.js에 분리 — 테스트는 app.js를 직접 import
 */

const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ RunFit 서버 실행 중 — http://localhost:${PORT}`);
  console.log(`   환경: ${process.env.NODE_ENV || 'development'}`);
});
