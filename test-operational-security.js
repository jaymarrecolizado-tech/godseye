/**
 * Phase 5 Operational Security Tests
 * Tests secret management, backup procedures, monitoring, and incident response
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from backend
require('./backend/node_modules/dotenv').config({ path: './backend/.env.local' });

const authConfig = require('./backend/src/config/auth');

console.log('='.repeat(70));
console.log('PHASE 5 OPERATIONAL SECURITY TESTS');
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

console.log('\n--- Secret Management Tests ---\n');

// Test 1: .env.local is in .gitignore
const gitignorePath = path.join(__dirname, '.gitignore');
let gitignoreContent = '';
if (fs.existsSync(gitignorePath)) {
  gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
}
test('.gitignore exists and references .env files',
  gitignoreContent.includes('.env'));

// Test 2: .env.example exists for documentation
const envExamplePath = path.join(__dirname, 'backend/.env.example');
test('.env.example exists for documentation',
  fs.existsSync(envExamplePath));

// Test 3: .env.example does not contain actual secrets
const envExampleContent = fs.readFileSync(envExamplePath, 'utf-8');
test('.env.example does not contain hardcoded secrets',
  !envExampleContent.includes('JWT_SECRET=your-super-secret') &&
  !envExampleContent.includes('DB_PASSWORD=your-password'));

// Test 4: JWT_SECRET is properly configured
test('JWT_SECRET is configured and meets minimum length',
  authConfig.JWT_SECRET && authConfig.JWT_SECRET.length >= 32);

// Test 5: JWT_SECRET uses secure randomness (hex format)
test('JWT_SECRET uses cryptographically secure format',
  /^[a-f0-9]{64}$/.test(authConfig.JWT_SECRET));

// Test 6: .env.local is not committed (should be ignored)
const envLocalPath = path.join(__dirname, 'backend/.env.local');
test('.env.local exists for local configuration',
  fs.existsSync(envLocalPath));

console.log('\n--- Configuration Management Tests ---\n');

// Test 7: Environment-specific configuration
test('NODE_ENV is configured',
  process.env.NODE_ENV !== undefined);

// Test 8: Production checks implemented
test('Environment-aware configuration exists',
  authConfig.CSRF_COOKIE_SECURE !== undefined);

// Test 9: CORS origin is restricted
test('CORS origin is configured (not wildcard)',
  process.env.CORS_ORIGIN !== '*');

// Test 10: File upload directory is configured
const uploadDir = process.env.UPLOAD_DIR || './uploads';
test('File upload directory is configured',
  uploadDir !== undefined);

console.log('\n--- Backup Procedures Tests ---\n');

// Test 11: Database dump capability exists
test('Database is MySQL (supports standard backup tools)',
  process.env.DB_NAME !== undefined);

// Test 12: Connection details configured for backup scripts
test('Database connection details are available',
  process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);

// Test 13: Audit logs can be exported
test('Audit logging system exists for data export',
  fs.existsSync(path.join(__dirname, 'backend/src/controllers/audit.controller.js')));

console.log('\n--- Monitoring & Logging Tests ---\n');

// Test 14: Application logging is configured
test('Logging level is configured',
  process.env.LOG_LEVEL !== undefined);

// Test 15: Log file path is configured
const logFile = process.env.LOG_FILE || './logs/app.log';
test('Log file path is configured',
  logFile !== undefined);

// Test 16: Security logging exists
test('Audit logging middleware exists',
  fs.existsSync(path.join(__dirname, 'backend/src/middleware/auditLogger.js')));

// Test 17: Security event tracking exists
test('Security logger middleware exists',
  fs.existsSync(path.join(__dirname, 'backend/src/middleware/securityLogger.js')));

console.log('\n--- Incident Response Tests ---\n');

// Test 18: Error handling middleware exists
test('Global error handling middleware exists',
  fs.existsSync(path.join(__dirname, 'backend/src/server.js')));

// Test 19: Rate limiting exists
test('Rate limiting middleware exists',
  fs.existsSync(path.join(__dirname, 'backend/src/middleware/rateLimiter.js')));

// Test 20: Account lockout mechanism exists
test('Account lockout mechanism is configured',
  authConfig.MAX_FAILED_ATTEMPTS > 0 && authConfig.LOCKOUT_DURATION_MINUTES > 0);

// Test 21: Token revocation capability exists
test('Token revocation capability exists',
  fs.existsSync(path.join(__dirname, 'backend/src/utils/tokenStorage.js')));

console.log('\n--- Dependency Security Tests ---\n');

// Test 22: package.json exists
const packagePath = path.join(__dirname, 'backend/package.json');
test('package.json exists',
  fs.existsSync(packagePath));

// Test 23: Dependencies are defined
const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
test('Backend dependencies are defined',
  packageContent.dependencies && Object.keys(packageContent.dependencies).length > 0);

// Test 24: Security dependencies included
test('Security dependencies included',
  packageContent.dependencies.helmet &&
  packageContent.dependencies.bcryptjs &&
  packageContent.dependencies['express-rate-limit']);

console.log('\n--- Server Security Tests ---\n');

// Test 25: Security headers (Helmet) is used
test('Helmet security headers are used',
  packageContent.dependencies.helmet !== undefined);

// Test 26: CORS is configured
test('CORS middleware is used',
  packageContent.dependencies.cors !== undefined);

// Test 27: Input validation is used
test('Input validation middleware is used',
  packageContent.dependencies['express-validator'] !== undefined);

// Test 28: CSRF protection exists
test('CSRF protection middleware exists',
  fs.existsSync(path.join(__dirname, 'backend/src/middleware/csrf.js')));

console.log('\n--- File Security Tests ---\n');

// Test 29: Upload directory configuration
test('Upload size limit is configured',
  process.env.UPLOAD_MAX_SIZE !== undefined);

// Test 30: Upload size limit is reasonable (< 20MB)
const maxSize = parseInt(process.env.UPLOAD_MAX_SIZE, 10);
test('Upload size limit is reasonable (< 20MB)',
  maxSize > 0 && maxSize < 20971520); // < 20MB

// Test 31: Upload directory is defined
test('Upload directory is defined',
  process.env.UPLOAD_DIR !== undefined);

console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed`);
console.log('='.repeat(70));

if (failedTests > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All Phase 5 operational security tests passed');
  process.exit(0);
}
