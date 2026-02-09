/**
 * Simple XSS Test - Direct verification
 */

const { sanitizeString } = require('./backend/src/utils/sanitize');

const criticalPayloads = [
  { name: 'Script tag', payload: '<script>alert(1)</script>' },
  { name: 'IMG onerror', payload: '<img src=x onerror=alert(1)>' },
  { name: 'DIV onclick', payload: '<div onclick="alert(1)">X</div>' },
  { name: 'JavaScript href', payload: '<a href="javascript:alert(1)">X</a>' },
  { name: 'SVG onload', payload: '<svg onload=alert(1)>X</svg>' },
  { name: 'IFRAME', payload: '<iframe src="javascript:alert(1)"></iframe>' },
  { name: 'Unicode JS', payload: 'javas&#99;ript:alert(1)' },
  { name: 'Backtick event', payload: '<img onerror=`alert(1)`>' }
];

console.log('XSS Test Results\n');
console.log('='.repeat(70));

let blocked = 0;
let issues = [];

criticalPayloads.forEach((test, i) => {
  const result = sanitizeString(test.payload);

  // Check if dangerous patterns still exist
  const hasScript = /<script\b/i.test(result) && !/&lt;script/i.test(result);
  const hasEvent = /\bon(error|click|load)\b/i.test(result);
  const hasJS = /javascript\s*:/i.test(result);

  const safe = !hasScript && !hasEvent && !hasJS;

  if (safe) {
    console.log(`✓ Test ${i + 1}: ${test.name} - BLOCKED`);
    blocked++;
  } else {
    console.log(`✗ Test ${i + 1}: ${test.name} - ISSUE`);
    console.log(`  Input:  ${test.payload}`);
    console.log(`  Output: ${result}`);
    if (hasScript) issues.push('Script tag present');
    if (hasEvent) issues.push('Event handler present');
    if (hasJS) issues.push('javascript: present');
  }
});

console.log('='.repeat(70));
console.log(`Summary: ${blocked}/${criticalPayloads.length} payloads blocked`);
console.log(`Issues found: ${issues.length > 0 ? issues.join(', ') : 'None'}`);

if (blocked === criticalPayloads.length) {
  console.log('\n✅ All critical XSS payloads blocked');
  process.exit(0);
} else {
  console.log('\n❌ Some XSS payloads not properly blocked');
  console.log('Recommendation: Upgrade to DOMPurify for production');
  process.exit(1);
}
