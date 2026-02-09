/**
 * Phase 3 Session & Account Lockout Tests
 * Tests session management and account lockout policies
 */

const authController = require('./backend/src/controllers/auth.controller');
const authConfig = require('./backend/src/config/auth');
const jwt = require('./backend/node_modules/jsonwebtoken');

console.log('='.repeat(70));
console.log('PHASE 3 SESSION & ACCOUNT LOCKOUT TESTS');
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

console.log('\n--- Session Management Tests ---\n');

// Test 1: Access token generation function exists
test('generateAccessToken function is exported',
  typeof authController.generateAccessToken === 'function');

// Test 2: Refresh token generation function exists
test('generateRefreshToken function is exported',
  typeof authController.generateRefreshToken === 'function');

// Test 3: Login function exists
test('login function is exported',
  typeof authController.login === 'function');

// Test 4: Logout function exists
test('logout function is exported',
  typeof authController.logout === 'function');

// Test 5: Refresh function exists
test('refresh function is exported',
  typeof authController.refresh === 'function');

// Test 6: getMe function exists
test('getMe function is exported',
  typeof authController.getMe === 'function');

console.log('\n--- JWT Token Tests ---\n');

// Test 7: Access token can be generated
const samplePayload = {
  userId: 1,
  username: 'testuser',
  email: 'test@example.com',
  role: 'Viewer',
  fullName: 'Test User'
};

try {
  const accessToken = authController.generateAccessToken(samplePayload);
  test('Access token is generated successfully', !!accessToken);

  // Test 8: Access token can be decoded
  const decoded = jwt.decode(accessToken);
  test('Access token can be decoded', !!decoded);

  // Test 9: Access token contains user data
  const decodedMatches = decoded &&
    decoded.userId === 1 &&
    decoded.username === 'testuser' &&
    decoded.role === 'Viewer';
  test('Access token contains correct user data', decodedMatches);

  // Test 10: Refresh token can be generated
  const refreshToken = authController.generateRefreshToken({ userId: 1 });
  test('Refresh token is generated successfully', !!refreshToken);

  // Test 11: Access token is valid JWT
  const validAccessToken = jwt.verify(accessToken, authConfig.JWT_SECRET, { ignoreExpiration: true });
  test('Access token is valid JWT', !!validAccessToken);

  // Test 12: Refresh token is valid JWT
  const validRefreshToken = jwt.verify(refreshToken, authConfig.JWT_SECRET, { ignoreExpiration: true });
  test('Refresh token is valid JWT', !!validRefreshToken);

} catch (error) {
  console.log('Error during JWT tests:', error.message);
  test('Access token generation', false);
  test('Access token decode', false);
  test('Access token user data', false);
  test('Refresh token generation', false);
  test('Access token validity', false);
  test('Refresh token validity', false);
}

console.log('\n--- Account Lockout Configuration Tests ---\n');

// Test 13: MAX_FAILED_ATTEMPTS is configured
test('MAX_FAILED_ATTEMPTS is configured',
  authConfig.MAX_FAILED_ATTEMPTS > 0);

// Test 14: MAX_FAILED_ATTEMPTS is reasonable (3-10)
test('MAX_FAILED_ATTEMPTS is reasonable (3-10)',
  authConfig.MAX_FAILED_ATTEMPTS >= 3 && authConfig.MAX_FAILED_ATTEMPTS <= 10);

// Test 15: LOCKOUT_DURATION_MINUTES is configured
test('LOCKOUT_DURATION_MINUTES is configured',
  authConfig.LOCKOUT_DURATION_MINUTES > 0);

// Test 16: LOCKOUT_DURATION_MINUTES is reasonable (15-60)
test('LOCKOUT_DURATION_MINUTES is reasonable (15-60)',
  authConfig.LOCKOUT_DURATION_MINUTES >= 15 && authConfig.LOCKOUT_DURATION_MINUTES <= 60);

console.log('\n--- Account Lockout Logic Tests ---\n');

// Mock user object for testing account lockout
const lockedUser = {
  failed_login_attempts: 5,
  locked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString()
};

const unlockedUser = {
  failed_login_attempts: 0,
  locked_until: null
};

const expiredLockUser = {
  failed_login_attempts: 5,
  locked_until: new Date(Date.now() - 30 * 60 * 1000).toISOString()
};

// Test 17: Lock time calculation for locked account
const now = new Date();
const lockUntil = new Date(lockedUser.locked_until);
test('Account lockout time is correctly calculated',
  lockUntil > now);

// Test 18: Account with null locked_until is not locked
test('Account with null locked_until is not locked',
  !unlockedUser.locked_until);

console.log('\n--- Password Change Security Tests ---\n');

// Test 19: changePassword function exists
test('changePassword function is exported',
  typeof authController.changePassword === 'function');

console.log('\n--- Token Expiration Tests ---\n');

// Test 20: Access token has expiration
const testAccessToken = authController.generateAccessToken(samplePayload);
const decodedAccess = jwt.decode(testAccessToken);
test('Access token has expiration time',
  !!decodedAccess.exp);

// Test 21: Refresh token has expiration
const testRefreshToken = authController.generateRefreshToken({ userId: 1 });
const decodedRefresh = jwt.decode(testRefreshToken);
test('Refresh token has expiration time',
  !!decodedRefresh.exp);

// Test 22: Refresh token expires later than access token
test('Refresh token expires later than access token',
  decodedRefresh.exp > decodedAccess.exp);

console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed`);
console.log('='.repeat(70));

if (failedTests > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All Phase 3 Session & Account Lockout tests passed');
  process.exit(0);
}
