/**
 * Phase 3 Authentication & Security Tests
 * Tests password strength, JWT configuration, and security policies
 */

const authConfig = require('./backend/src/config/auth');
const { validatePasswordStrength, calculatePasswordStrength } = require('./backend/src/utils/passwordValidator');

console.log('='.repeat(70));
console.log('PHASE 3 AUTHENTICATION & SECURITY TESTS');
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

console.log('\n--- JWT Configuration Tests ---\n');

// Test 1: JWT_SECRET is set
test('JWT_SECRET is configured', !!authConfig.JWT_SECRET);

// Test 2: JWT_SECRET meets minimum length (32 chars)
test('JWT_SECRET meets minimum length (32 chars)', authConfig.JWT_SECRET.length >= 32);

// Test 3: JWT_EXPIRES_IN is set
test('JWT_EXPIRES_IN is configured', !!authConfig.JWT_EXPIRES_IN);

// Test 4: JWT_REFRESH_EXPIRES_IN is set
test('JWT_REFRESH_EXPIRES_IN is configured', !!authConfig.JWT_REFRESH_EXPIRES_IN);

console.log('\n--- Password Policy Tests ---\n');

// Test 5: Minimum password length is 12+
test('PASSWORD_MIN_LENGTH is at least 12', authConfig.PASSWORD_MIN_LENGTH >= 12);

// Test 6: Maximum password length is configured
test('PASSWORD_MAX_LENGTH is configured', authConfig.PASSWORD_MAX_LENGTH > 0);

// Test 7: BCRYPT_ROUNDS is at least 10
test('BCRYPT_ROUNDS is at least 10', authConfig.BCRYPT_ROUNDS >= 10);

console.log('\n--- Account Lockout Tests ---\n');

// Test 8: MAX_FAILED_ATTEMPTS is configured
test('MAX_FAILED_ATTEMPTS is configured', authConfig.MAX_FAILED_ATTEMPTS > 0);

// Test 9: MAX_FAILED_ATTEMPTS is reasonable (3-10)
test('MAX_FAILED_ATTEMPTS is reasonable (3-10)', authConfig.MAX_FAILED_ATTEMPTS >= 3 && authConfig.MAX_FAILED_ATTEMPTS <= 10);

// Test 10: LOCKOUT_DURATION_MINUTES is configured
test('LOCKOUT_DURATION_MINUTES is configured', authConfig.LOCKOUT_DURATION_MINUTES > 0);

// Test 11: LOCKOUT_DURATION_MINUTES is reasonable (15-60)
test('LOCKOUT_DURATION_MINUTES is reasonable (15-60)', authConfig.LOCKOUT_DURATION_MINUTES >= 15 && authConfig.LOCKOUT_DURATION_MINUTES <= 60);

console.log('\n--- Rate Limiting Tests ---\n');

// Test 12: RATE_LIMIT_WINDOW_MS is configured
test('RATE_LIMIT_WINDOW_MS is configured', authConfig.RATE_LIMIT_WINDOW_MS > 0);

// Test 13: RATE_LIMIT_MAX_ATTEMPTS is configured
test('RATE_LIMIT_MAX_ATTEMPTS is configured', authConfig.RATE_LIMIT_MAX_ATTEMPTS > 0);

console.log('\n--- CSRF Protection Tests ---\n');

// Test 14: CSRF_COOKIE_SECURE is configured
test('CSRF_COOKIE_SECURE is configured', authConfig.CSRF_COOKIE_SECURE !== undefined);

// Test 15: CSRF_COOKIE_SAME_SITE is strict
test('CSRF_COOKIE_SAME_SITE is configured', !!authConfig.CSRF_COOKIE_SAME_SITE);

console.log('\n--- Password Strength Validation Tests ---\n');

const passwordTests = [
  { password: 'SecureP@ssw0rd!', desc: 'Valid strong password (no common/sequential)', shouldPass: true },
  { password: 'short', desc: 'Too short password', shouldPass: false },
  { password: 'lowercaseonly', desc: 'No uppercase or numbers', shouldPass: false },
  { password: 'UPPERCASEONLY', desc: 'No lowercase or numbers', shouldPass: false },
  { password: 'NoSpecialChars123', desc: 'No special characters', shouldPass: false },
  { password: 'NoNumbers!', desc: 'No numbers', shouldPass: false },
  { password: 'password', desc: 'Common password', shouldPass: false },
  { password: 'aaaaa11111!', desc: 'Repeating characters', shouldPass: false },
  { password: 'abcXYZ789!', desc: 'Sequential characters', shouldPass: false },
  { password: 'Xk9#mP2$vL8!nQ5@', desc: 'Valid complex password', shouldPass: true }
];

passwordTests.forEach(({ password, desc, shouldPass }) => {
  const error = validatePasswordStrength(password);
  const passed = shouldPass ? !error : !!error;
  test(`Password validation: ${desc}`, passed);
});

console.log('\n--- Password Strength Calculation Tests ---\n');

const strengthTests = [
  { password: 'Pass', expected: 'weak' },  // Only uppercase and lowercase
  { password: 'Pass123!', expected: 'medium' },  // Has all elements but short
  { password: 'VeryStrongP@ssw0rdWithL3ngth!', expected: 'strong' }
];

strengthTests.forEach(({ password, expected }) => {
  const strength = calculatePasswordStrength(password);
  test(`Password "${password}" strength: ${strength} (${expected})`, strength === expected);
});

console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed`);
console.log('='.repeat(70));

if (failedTests > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All Phase 3 authentication tests passed');
  process.exit(0);
}
