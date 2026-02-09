/**
 * XSS Sanitization Test Suite - DETAILED
 * Analyzing sanitized output for actual XSS vectors
 */

const { sanitizeString } = require('./backend/src/utils/sanitize');

// More sophisticated XSS detection in output
function hasXSSInOutput(output) {
  const xssIndicators = [
    // Script tags
    /<script\b[^>]*>/i,
    /<\/script>/i,

    // Event handlers that could still execute
    /<[^>]+\s+on\w+\s*=/i,
    /on\w+\s*=\s*["']/i,
    /on\w+\s*=\s*`/i,

    // JavaScript protocol
    /javascript\s*:/i,

    // Data URLs that could execute
    /data\s*:\s*text\/html/i,
    /data\s*:\s*image\/svg/i,

    // CSS expressions (IE)
    /expression\s*\(/i,

    // vbscript
    /vbscript\s*:/i,

    // @import
    /@import\s*url/i
  ];

  return xssIndicators.some(pattern => pattern.test(output));
}

function checkEventHandlerSafety(output) {
  // Check if onerror, onclick, etc. still present outside of quotes
  const dangerousEvents = /on(error|click|mouseover|enter|touchstart|focus|load|submit|change|input|blur|hover|mouseenter|scroll|resize|dblclick|keydown|keyup|keypress|reset)/i;

  if (!dangerousEvents.test(output)) {
    return { safe: true, reason: 'No dangerous event handlers found' };
  }

  // Check if event handler is inside HTML entity encoded content
  const inQuotes = /&quot;.*on(error|click|mouseover)/i.test(output) ||
                 /&#x27;.*on(error|click|mouseover)/i.test(output);

  if (inQuotes) {
    return { safe: true, reason: 'Event handler inside encoded quotes' };
  }

  return { safe: false, reason: 'Dangerous event handler found' };
}

function checkScriptTags(output) {
  if (output && typeof output === 'string') {
    if (output.includes('<script') && !output.includes('&lt;script')) {
      return { safe: false, reason: 'Script tag still present' };
    }
  }
  return { safe: true, reason: 'Script tags properly encoded' };
}

function testPayload(name, payload, category) {
  const sanitized = sanitizeString(payload);
  const xssInOutput = hasXSSInOutput(sanitized);
  const eventCheck = checkEventHandlerSafety(sanitized);
  const scriptCheck = checkScriptTags(sanitized);

  let status;
  let details = [];

  if (!xssInOutput && eventCheck.safe && scriptCheck.safe) {
    status = '✓ BLOCKED';
    details.push(eventCheck.reason, scriptCheck.reason);
  } else if (sanitized !== payload) {
    status = '⚠ PARTIAL';
    if (!eventCheck.safe) details.push('ISSUE: ' + eventCheck.reason);
    if (!scriptCheck.safe) details.push('ISSUE: ' + scriptCheck.reason);
    if (xssInOutput) details.push('ISSUE: XSS indicators still present');
  } else {
    status = '✗ BYPASSED';
    details.push('No sanitization applied');
  }

  return {
    name,
    category,
    payload,
    sanitized: sanitized.substring(0, 150),
    status,
    details,
    xssInOutput,
    eventSafe: eventCheck.safe,
    scriptSafe: scriptCheck.safe
  };
}

const tests = [
  { name: 'Basic Script Tag', payload: '<script>alert("XSS")</script>', category: 'Basic' },
  { name: 'IMG onerror', payload: '<img src=x onerror=alert("XSS")>', category: 'Event Handler' },
  { name: 'DIV onclick', payload: '<div onclick="alert(\'XSS\')">Click</div>', category: 'Event Handler' },
  { name: 'HTML Entity Encoded', payload: '&lt;script&gt;alert(1)&lt;/script&gt;', category: 'Encoding' },
  { name: 'JavaScript Protocol', payload: '<a href="javascript:alert(1)">Click</a>', category: 'Protocol' },
  { name: 'SVG onload', payload: '<svg onload=alert(1)>XSS</svg>', category: 'SVG' },
  { name: 'IFRAME', payload: '<iframe src="javascript:alert(1)"></iframe>', category: 'IFrame' },
  { name: 'Backtick Event', payload: '<img src=x onerror=`alert(1)`>', category: 'Event Handler' },
  { name: 'Unicode JavaScript', payload: 'javas&#99;ript:alert(1)', category: 'Encoding' },
  { name: 'CSS Expression', payload: '<div style="background:expression(alert(1))">XSS</div>', category: 'CSS' },
  { name: 'Data URI', payload: '<img src="data:text/html,<script>alert(1)</script>">', category: 'Data URI' },
  { name: 'Form Action', payload: '<form action="javascript:alert(1)"><input></form>', category: 'Form' },
  { name: 'Input onfocus', payload: '<input onfocus="alert(1)" autofocus>', category: 'Event Handler' },
  { name: 'Body onload', payload: '<body onload=alert(1)>', category: 'Event Handler' },
  { name: 'Video onplay', payload: '<video onplay=alert(1)><source></video>', category: 'Event Handler' },
  { name: 'Details ontoggle', payload: '<details ontoggle=alert(1)>Click</details>', category: 'Event Handler' }
];

console.log('='.repeat(80));
console.log('XSS Sanitization Test Suite - Detailed Analysis');
console.log('='.repeat(80));
console.log();

const results = tests.map(testPayload);

results.forEach((result, i) => {
  const sanitizedOutput = typeof result.sanitized === 'string' ? result.sanitized : String(result.sanitized || '');
  console.log(`Test ${i + 1}/${results.length}: ${result.name}`);
  console.log(`  Category: ${result.category}`);
  console.log(`  Input:  ${result.payload}`);
  console.log(`  Output: ${sanitizedOutput.substring(0, 150)}${result.payload.length > 150 ? '...' : ''}`);
  console.log(`  Status: ${result.status}`);
  if (result.details.length > 0) {
    result.details.forEach(d => console.log(`  - ${d}`));
  }
  console.log();
});

const summary = {
  blocked: results.filter(r => r.status.includes('BLOCKED')).length,
  partial: results.filter(r => r.status.includes('PARTIAL')).length,
  bypassed: results.filter(r => r.status.includes('BYPASSED')).length,
  unsafeOutputs: results.filter(r => r.xssInOutput).length,
  unsafeEvents: results.filter(r => !r.eventSafe).length,
  unsafeScripts: results.filter(r => !r.scriptSafe).length
};

console.log('='.repeat(80));
console.log('SUMMARY');
console.log('='.repeat(80));
console.log(`Total Tests: ${results.length}`);
console.log(`Blocked: ${summary.blocked}`);
console.log(`Partial: ${summary.partial}`);
console.log(`Bypassed: ${summary.bypassed}`);
console.log();
console.log(`Outputs with XSS indicators: ${summary.unsafeOutputs}`);
console.log(`Outputs with unsafe event handlers: ${summary.unsafeEvents}`);
console.log(`Outputs with unsafe script tags: ${summary.unsafeScripts}`);

const safeTests = results.filter(r => !r.xssInOutput && r.eventSafe && r.scriptSafe).length;
const passRate = ((safeTests / results.length) * 100).toFixed(1);
console.log();
console.log(`Effectively Blocked: ${safeTests}/${results.length} (${passRate}%)`);

console.log();
if (summary.bypassed > 0) {
  console.log('❌ CRITICAL: XSS payloads bypassed!');
  console.log('   → Upgrade to DOMPurify immediately');
} else if (summary.unsafeOutputs > 0 || summary.unsafeEvents > 0 || summary.unsafeScripts > 0) {
  console.log('⚠️  WARNING: Some sanitized outputs still contain XSS vectors');
  console.log('   → Current sanitization is NOT production-safe');
  console.log('   → Upgrade to DOMPurify recommended');
} else {
  console.log('✅ SUCCESS: All XSS vectors blocked');
}

console.log('='.repeat(80));

// Exit code: 0 = all safe, 1 = issues found
process.exit((summary.bypassed > 0 || summary.unsafeOutputs > 0) ? 1 : 0);
