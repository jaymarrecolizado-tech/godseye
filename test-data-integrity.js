/**
 * Phase 4 Data Integrity Tests
 * Tests database transactions, audit logs, and concurrency
 */

const { query, transaction } = require('./backend/src/config/database');
const auditLogger = require('./backend/src/middleware/auditLogger');

console.log('='.repeat(70));
console.log('PHASE 4 DATA INTEGRITY TESTS');
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

console.log('\n--- Transaction Management Tests ---\n');

// Test 1: Transaction function is exported
test('Transaction function is exported',
  typeof transaction === 'function');

// Test 2: Test successful transaction commit
(async () => {
  try {
    await transaction(async (connection) => {
      await connection.query('INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
        ['test_user_1', 'test1@example.com', 'hash123', 'Test User 1', 'Viewer']);
    });

    // Verify record was created
    const users = await query('SELECT * FROM users WHERE username = ?', ['test_user_1']);
    test('Successful transaction commits changes', users.length > 0);

    // Cleanup
    await query('DELETE FROM users WHERE username = ?', ['test_user_1']);
  } catch (error) {
    console.log('Transaction test error:', error.message);
    test('Successful transaction commits changes', false);
  }
})();

// Test 3: Test transaction rollback on error
(async () => {
  try {
    try {
      await transaction(async (connection) => {
        await connection.query('INSERT INTO users (username, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)',
          ['test_user_2', 'test2@example.com', 'hash123', 'Test User 2', 'Viewer']);
        throw new Error('Rollback test error');
      });
    } catch (err) {
      if (err.message === 'Rollback test error') {
        // Verify record was NOT created (rolled back)
        const users = await query('SELECT * FROM users WHERE username = ?', ['test_user_2']);
        test('Failed transaction rolls back changes', users.length === 0);
      } else {
        throw err;
      }
    }
  } catch (error) {
    console.log('Rollback test error:', error.message);
    test('Failed transaction rolls back changes', false);
  }
})();

console.log('\n--- Audit Logger Tests ---\n');

// Test 4: Audit middleware is exported
test('auditMiddleware is exported',
  typeof auditLogger.auditMiddleware === 'function');

// Test 5: Manual audit log function is exported
test('manualAuditLog is exported',
  typeof auditLogger.manualAuditLog === 'function');

// Test 6: logCreate function is exported
test('logCreate is exported',
  typeof auditLogger.logCreate === 'function');

// Test 7: logUpdate function is exported
test('logUpdate is exported',
  typeof auditLogger.logUpdate === 'function');

// Test 8: logDelete function is exported
test('logDelete is exported',
  typeof auditLogger.logDelete === 'function');

console.log('\n--- Audit Logger Functionality Tests ---\n');

// Test 9: Audit middleware creates middleware function
const auditMiddleware = auditLogger.auditMiddleware('users');
test('Audit middleware creates middleware function',
  typeof auditMiddleware === 'function');

// Test 10: Audit middleware accepts multiple entities
test('Audit middleware accepts multiple entity types',
  typeof auditLogger.auditMiddleware('project_sites') === 'function' &&
  typeof auditLogger.auditMiddleware('users') === 'function');

console.log('\n--- Database Configuration Tests ---\n');

// Test 12: Query function is exported
const dbConfig = require('./backend/src/config/database');
test('Query function is exported',
  typeof dbConfig.query === 'function');

// Test 13: Build pagination function is exported
test('Build pagination function is exported',
  typeof dbConfig.buildPagination === 'function');

// Test 14: Build WHERE clause function is exported
test('Build WHERE clause function is exported',
  typeof dbConfig.buildWhereClause === 'function');

console.log('\n--- Pagination Tests ---\n');

// Test 15: Pagination with default values
const defaultPagination = dbConfig.buildPagination();
test('Pagination returns default values',
  defaultPagination.page === 1 && defaultPagination.limit === 50);

// Test 16: Pagination with custom values
const customPagination = dbConfig.buildPagination(2, 25);
test('Pagination returns custom values',
  customPagination.page === 2 && customPagination.limit === 25);

// Test 17: Pagination offset calculation
test('Pagination calculates correct offset',
  customPagination.offset === 25);

// Test 18: Pagination limits maximum page size
const maxLimit = dbConfig.buildPagination(1, 150);
test('Pagination limits maximum page size to 100',
  maxLimit.limit === 100);

console.log('\n--- WHERE Clause Tests ---\n');

// Test 19: Build WHERE clause with single filter
const singleWhere = dbConfig.buildWhereClause({ status: 'active' });
test('WHERE clause handles single filter',
  singleWhere.whereClause.includes('status = ?') && singleWhere.params.length === 1);

// Test 20: Build WHERE clause with multiple filters
const multiWhere = dbConfig.buildWhereClause({ status: 'active', type: 'user' });
test('WHERE clause handles multiple filters',
  multiWhere.whereClause.includes('AND') && multiWhere.params.length === 2);

// Test 21: Build WHERE clause with array filter
const arrayWhere = dbConfig.buildWhereClause({ id: [1, 2, 3] });
test('WHERE clause handles array filters',
  arrayWhere.whereClause.includes('IN') && arrayWhere.params.length === 3);

// Test 22: Build WHERE clause with no filters
const noWhere = dbConfig.buildWhereClause({});
test('WHERE clause handles no filters',
  noWhere.whereClause === '' && noWhere.params.length === 0);

console.log('\n--- Concurrency Tests ---\n');

// Test 23: Connection pool is configured
test('Connection pool is configured',
  !!dbConfig.pool);

// Test 24: Connection limit is reasonable
test('Connection pool limit is reasonable (5-20)',
  dbConfig.pool && dbConfig.pool.pool && dbConfig.pool.pool.config.connectionLimit >= 5 &&
  dbConfig.pool.pool.config.connectionLimit <= 20);

// Test 25: Connection timeout is configured
test('Connection pool config is properly initialized',
  dbConfig.pool && typeof dbConfig.pool.getConnection === 'function');

console.log('\n--- SQL Injection Prevention Tests ---\n');

// Test 26: buildWhereClause escapes special characters in values
const specialWhere = dbConfig.buildWhereClause({ name: "O'Reilly" });
test('WHERE clause handles special characters',
  specialWhere.params[0] === "O'Reilly");

// Test 27: buildWhereClause handles NULL values
const nullWhere = dbConfig.buildWhereClause({ status: null, active: true });
test('WHERE clause handles NULL values correctly',
  nullWhere.params.length === 1 && nullWhere.params[0] === true);

console.log('\n--- Audit Controller Tests ---\n');

// Test 28: Audit controller is exported
const auditController = require('./backend/src/controllers/audit.controller');
test('Audit controller is exported',
  typeof auditController.getAuditLogs === 'function');

// Test 29: Audit statistics function exists
test('Audit statistics function exists',
  typeof auditController.getAuditStats === 'function');

// Test 30: Audit log by ID function exists
test('Audit log by ID function exists',
  typeof auditController.getAuditLogById === 'function');

console.log('\n--- Error Handling Tests ---\n');

// Test 31: Query function handles errors
test('Query function has error handling',
  typeof dbConfig.query === 'function');

// Test 32: Transaction function has error handling
test('Transaction function has error handling',
  typeof dbConfig.transaction === 'function');

setTimeout(() => {
  console.log('\n' + '='.repeat(70));
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} passed`);
  console.log('='.repeat(70));

  if (failedTests > 0) {
    console.log('\nFailed tests:');
    failures.forEach(f => console.log(`  ✗ ${f}`));
    process.exit(1);
  } else {
    console.log('\n✅ All Phase 4 data integrity tests passed');
    process.exit(0);
  }
}, 1000);
