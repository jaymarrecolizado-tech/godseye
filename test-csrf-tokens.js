/**
 * Phase 3 CSRF & Token Storage Tests
 * Tests CSRF protection and refresh token storage
 */

const csrf = require('./backend/src/middleware/csrf');
const tokenStorage = require('./backend/src/utils/tokenStorage');
const authConfig = require('./backend/src/config/auth');

console.log('='.repeat(70));
console.log('PHASE 3 CSRF & TOKEN STORAGE TESTS');
console.log('='.repeat(70));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(description, condition) {
  totalTests++;
  const status = condition ? '✓' : '✗';
  console.log(`${status} ${description}`);

  if (condition) {
    passedTests++;
  } else {
    failedTests++;
    failures.push(description);
  }
  return condition;
}

console.log('\n--- CSRF Middleware Tests ---\n');

// Test 1: CSRF token generation function exists
test('generateCSRFToken function is exported',
  typeof csrf.generateCSRFToken === 'function');

// Test 2: CSRF protection middleware exists
test('csrfProtection middleware is exported',
  typeof csrf.csrfProtection === 'function');

// Test 3: CSRF validation function exists
test('validateCSRFToken function is exported',
  typeof csrf.validateCSRFToken === 'function');

// Test 4: CSRF token is 64 characters (32 bytes hex)
const token = csrf.generateCSRFToken();
test('CSRF token is 64 characters (32 bytes hex)',
  token.length === 64);

// Test 5: CSRF token contains only hex characters
test('CSRF token contains only hex characters',
  /^[a-f0-9]{64}$/.test(token));

// Test 6: CSRF tokens are unique
const token2 = csrf.generateCSRFToken();
test('CSRF tokens are unique',
  token !== token2);

console.log('\n--- CSRF Configuration Tests ---\n');

// Test 7: CSRF_COOKIE_SECURE is configured
test('CSRF_COOKIE_SECURE is configured',
  authConfig.CSRF_COOKIE_SECURE !== undefined);

// Test 8: CSRF_COOKIE_SAME_SITE is strict
test('CSRF_COOKIE_SAME_SITE is strict',
  authConfig.CSRF_COOKIE_SAME_SITE === 'strict');

console.log('\n--- Token Storage Tests ---\n');

// Test 9: hashToken function exists
test('hashToken function is exported',
  typeof tokenStorage.hashToken === 'function');

// Test 10: storeRefreshToken function exists
test('storeRefreshToken function is exported',
  typeof tokenStorage.storeRefreshToken === 'function');

// Test 11: validateRefreshToken function exists
test('validateRefreshToken function is exported',
  typeof tokenStorage.validateRefreshToken === 'function');

// Test 12: revokeRefreshToken function exists
test('revokeRefreshToken function is exported',
  typeof tokenStorage.revokeRefreshToken === 'function');

// Test 13: revokeAllUserTokens function exists
test('revokeAllUserTokens function is exported',
  typeof tokenStorage.revokeAllUserTokens === 'function');

// Test 14: cleanupExpiredTokens function exists
test('cleanupExpiredTokens function is exported',
  typeof tokenStorage.cleanupExpiredTokens === 'function');

console.log('\n--- Token Hashing Tests ---\n');

// Test 15: Token hashing produces consistent result
const sampleToken = 'sample-token-12345';
const hash1 = tokenStorage.hashToken(sampleToken);
const hash2 = tokenStorage.hashToken(sampleToken);
test('Token hashing is consistent',
  hash1 === hash2);

// Test 16: Token hashing produces different results for different inputs
const hash3 = tokenStorage.hashToken('different-token');
test('Token hashing produces different results for different inputs',
  hash1 !== hash3);

// Test 17: Hash is 64 characters (SHA-256 hex)
test('Hash is 64 characters (SHA-256 hex)',
  hash1.length === 64);

// Test 18: Hash contains only hex characters
test('Hash contains only hex characters',
  /^[a-f0-9]{64}$/.test(hash1));

console.log('\n--- Refresh Token Configuration Tests ---\n');

// Test 19: JWT_EXPIRES_IN is configured
test('JWT_EXPIRES_IN is configured',
  !!authConfig.JWT_EXPIRES_IN);

// Test 20: JWT_REFRESH_EXPIRES_IN is configured
test('JWT_REFRESH_EXPIRES_IN is configured',
  !!authConfig.JWT_REFRESH_EXPIRES_IN);

// Test 21: Refresh token expires longer than access token
const accessTime = parseTime(authConfig.JWT_EXPIRES_IN);
const refreshTime = parseTime(authConfig.JWT_REFRESH_EXPIRES_IN);
test('Refresh token expires longer than access token',
  refreshTime > accessTime);

function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+)([smhd])$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
  return value * (multipliers[unit] || 1);
}

console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed`);
console.log('='.repeat(70));

if (failedTests > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All Phase 3 CSRF & Token Storage tests passed');
  process.exit(0);
}
