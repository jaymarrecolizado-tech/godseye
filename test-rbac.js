/**
 * Phase 3 RBAC Tests
 * Tests Role-Based Access Control implementation
 */

const authMiddleware = require('./backend/src/middleware/auth');

console.log('='.repeat(70));
console.log('PHASE 3 RBAC TESTS');
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

console.log('\n--- Middleware Functions Exported ---\n');

// Test 1: authenticateToken is exported
test('authenticateToken middleware is exported', typeof authMiddleware.authenticateToken === 'function');

// Test 2: requireRole is exported
test('requireRole middleware is exported', typeof authMiddleware.requireRole === 'function');

// Test 3: requireMinRole is exported
test('requireMinRole middleware is exported', typeof authMiddleware.requireMinRole === 'function');

// Test 4: requireOwnerOrAdmin is exported
test('requireOwnerOrAdmin middleware is exported', typeof authMiddleware.requireOwnerOrAdmin === 'function');

// Test 5: hasRoleLevel helper is exported
test('hasRoleLevel helper is exported', typeof authMiddleware.hasRoleLevel === 'function');

console.log('\n--- Role Hierarchy Tests ---\n');

// Test 6: Admin > Manager
test('Admin has higher level than Manager',
  authMiddleware.hasRoleLevel('Admin', 'Manager'));

// Test 7: Manager > Editor
test('Manager has higher level than Editor',
  authMiddleware.hasRoleLevel('Manager', 'Editor'));

// Test 8: Editor > Viewer
test('Editor has higher level than Viewer',
  authMiddleware.hasRoleLevel('Editor', 'Viewer'));

// Test 9: Admin access everything
test('Admin can access Admin level',
  authMiddleware.hasRoleLevel('Admin', 'Admin'));

// Test 10: Viewer cannot access Admin
test('Viewer cannot access Admin level',
  !authMiddleware.hasRoleLevel('Viewer', 'Admin'));

// Test 11: Manager can access Editor level
test('Manager can access Editor level',
  authMiddleware.hasRoleLevel('Manager', 'Editor'));

console.log('\n--- Role Equality Tests ---\n');

// Test 12: User with role can access same role
test('Admin can access Admin level (same role)',
  authMiddleware.hasRoleLevel('Admin', 'Admin'));

// Test 13: Manager can access Manager level
test('Manager can access Manager level (same role)',
  authMiddleware.hasRoleLevel('Manager', 'Manager'));

console.log('\n--- Token Extraction Tests ---\n');

// Test 14: Extract valid Bearer token
const mockReqBearer = { headers: { authorization: 'Bearer valid-token-123' } };
test('Extract valid Bearer token',
  authMiddleware.extractToken(mockReqBearer) === 'valid-token-123');

// Test 15: Reject non-Bearer token
const mockReqNonBearer = { headers: { authorization: 'Basic invalid' } };
test('Reject non-Bearer token',
  authMiddleware.extractToken(mockReqNonBearer) === null);

// Test 16: Reject malformed Bearer token
const mockReqMalformed = { headers: { authorization: 'Bearer' } };
test('Reject malformed Bearer token',
  authMiddleware.extractToken(mockReqMalformed) === null);

// Test 17: Reject missing authorization header
const mockReqNoAuth = { headers: {} };
test('Reject missing authorization header',
  authMiddleware.extractToken(mockReqNoAuth) === null);

console.log('\n--- Middleware Factory Tests ---\n');

// Test 18: requireRole creates middleware
const roleMiddleware = authMiddleware.requireRole('Admin');
test('requireRole creates middleware function',
  typeof roleMiddleware === 'function');

// Test 19: requireRole accepts array of roles
const multiRoleMiddleware = authMiddleware.requireRole(['Admin', 'Manager']);
test('requireRole accepts array of roles',
  typeof multiRoleMiddleware === 'function');

// Test 20: requireMinRole creates middleware
const minRoleMiddleware = authMiddleware.requireMinRole('Manager');
test('requireMinRole creates middleware function',
  typeof minRoleMiddleware === 'function');

// Test 21: requireOwnerOrAdmin creates middleware
const ownerMiddleware = authMiddleware.requireOwnerOrAdmin(() => Promise.resolve(1));
test('requireOwnerOrAdmin creates middleware function',
  typeof ownerMiddleware === 'function');

console.log('\n' + '='.repeat(70));
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed`);
console.log('='.repeat(70));

if (failedTests > 0) {
  console.log('\nFailed tests:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
} else {
  console.log('\n✅ All Phase 3 RBAC tests passed');
  process.exit(0);
}
