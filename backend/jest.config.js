/**
 * Jest 설정
 * - testEnvironment: node (브라우저 환경 아님)
 * - clearMocks: 각 테스트 전 mock 호출 카운트 초기화
 * - coverageFrom: routes + services 레이어만 커버리지 측정
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
  testTimeout: 10000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'services/**/*.js',
    '!**/node_modules/**',
  ],
  // 테스트 실행 시 console 출력 억제 (서비스 내 console.error/warn 노출 방지)
  silent: false,
};
