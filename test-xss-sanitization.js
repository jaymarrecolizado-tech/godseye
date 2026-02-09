/**
 * XSS Sanitization Test Suite
 * Testing sanitize.js implementation against various XSS payloads
 */

const { sanitizeInput, sanitizeString, hasSuspiciousContent } = require('./backend/src/utils/sanitize');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m', // PASS
  red: '\x1b[31m',    // FAIL/BLOCKED
  yellow: '\x1b[33m', // WARNING
  blue: '\x1b[36m',   // INFO
};

const testPayloads = [
  {
    name: 'Basic Script Tag',
    payload: '<script>alert("XSS")</script>',
    expected: 'BLOCKED',
    category: 'Basic'
  },
  {
    name: 'Script with Mixed Case',
    payload: '<ScRiPt>alert("XSS")</ScRiPt>',
    expected: 'BLOCKED',
    category: 'Case Bypass'
  },
  {
    name: 'IMG Tag with onerror',
    payload: '<img src=x onerror=alert("XSS")>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'DIV with onclick',
    payload: '<div onclick="alert(\'XSS\')">Click me</div>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'HTML Entity Encoding (script)',
    payload: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'HTML Entity Encoding (img)',
    payload: '&lt;img src=x onerror=alert("XSS")&gt;',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'JavaScript Protocol',
    payload: '<a href="javascript:alert(\'XSS\')">Click</a>',
    expected: 'BLOCKED',
    category: 'Protocol'
  },
  {
    name: 'JavaScript with Unicode (decimal)',
    payload: 'javas&#99;ript:alert("XSS")',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'JavaScript with Unicode (hex)',
    payload: 'javas&#x63;ript:alert("XSS")',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'Backtick Template Literal',
    payload: '<img src=x onerror=`alert("XSS")`>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'SVG onload',
    payload: '<svg onload=alert("XSS")>XSS</svg>',
    expected: 'BLOCKED',
    category: 'SVG'
  },
  {
    name: 'IFRAME',
    payload: '<iframe src="javascript:alert(\'XSS\')"></iframe>',
    expected: 'BLOCKED',
    category: 'IFrame'
  },
  {
    name: 'EMBED tag',
    payload: '<embed src="javascript:alert(\'XSS\')" type="application/x-shockwave-flash">',
    expected: 'BLOCKED',
    category: 'Embed'
  },
  {
    name: 'OBJECT tag',
    payload: '<object data="javascript:alert(\'XSS\')"></object>',
    expected: 'BLOCKED',
    category: 'Object'
  },
  {
    name: 'STYLE tag with expression',
    payload: '<div style="background:expression(alert(\'XSS\'))">XSS</div>',
    expected: 'BLOCKED',
    category: 'CSS'
  },
  {
    name: 'META refresh',
    payload: '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',
    expected: 'BLOCKED',
    category: 'Meta'
  },
  {
    name: 'LINK with javascript',
    payload: '<link href="javascript:alert(\'XSS\')">',
    expected: 'BLOCKED',
    category: 'Link'
  },
  {
    name: 'Event Handler: onmouseover',
    payload: '<div onmouseover="alert(\'XSS\')">Hover me</div>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'Event Handler: onmouseenter',
    payload: '<div onmouseenter="alert(\'XSS\')">Enter me</div>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'Event Handler: ontouchstart',
    payload: '<div ontouchstart="alert(\'XSS\')">Touch me</div>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'Event Handler: onfocus',
    payload: '<input type="text" onfocus="alert(\'XSS\')" autofocus>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'Event Handler: onload in body',
    payload: '<body onload=alert("XSS")>',
    expected: 'BLOCKED',
    category: 'Event Handlers'
  },
  {
    name: 'Mixed encoding: img src',
    payload: '<img src=x onerror="&#x61;l&#x65;rt(1)">',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'Unicode escape: script',
    payload: '<u003Cscriptu003Ealert(1)u003C/scriptu003E>',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'Percent encoding in href',
    payload: '<a href="%6a%61%76%61%73%63%72%69%70%74%3aalert(1)">Click</a>',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'Backslash in script',
    payload: '<script\\>alert("XSS")</script>',
    expected: 'BLOCKED',
    category: 'Basic'
  },
  {
    name: 'Null character',
    payload: '<scr\0ipt>alert("XSS")</scr\0ipt>',
    expected: 'BLOCKED',
    category: 'Special Characters'
  },
  {
    name: 'Comment-based',
    payload: '<!--<script>alert("XSS")</script>-->',
    expected: 'BLOCKED',
    category: 'Comment'
  },
  {
    name: 'Double URL encoding',
    payload: '<img src=x onerror="%26%2397;alert(1)">',
    expected: 'BLOCKED',
    category: 'Encoding Bypass'
  },
  {
    name: 'CSS data URI',
    payload: '<div style="background:url(data:text/html,<script>alert(1)</script>)">XSS</div>',
    expected: 'BLOCKED',
    category: 'CSS'
  },
  {
    name: 'FORM with action',
    payload: '<form action="javascript:alert(1)"><input type=submit></form>',
    expected: 'BLOCKED',
    category: 'Form'
  },
  {
    name: 'Base64 encoded src',
    payload: '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" onerror="alert(1)">',
    expected: 'BLOCKED',
    category: 'Data URI'
  },
  {
    name: 'XML payload',
    payload: '<?xml version="1.0"?><html:script>alert(1)</html:script>',
    expected: 'BLOCKED',
    category: 'XML'
  },
  {
    name: 'Math tag',
    payload: '<math><maction actiontype="statusline#http://example.com" onsubmit="alert(1)">XSS</maction></math>',
    expected: 'BLOCKED',
    category: 'MathML'
  }
];

function runTests() {
  console.log(colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.blue + 'XSS Sanitization Test Suite' + colors.reset);
  console.log(colors.blue + '='.repeat(80) + colors.reset);
  console.log();

  let blocked = 0;
  let bypassed = 0;
  let partial = 0;

  const resultsByCategory = {};

  testPayloads.forEach((test, index) => {
    const sanitized = sanitizeString(test.payload);
    const hasSuspicious = hasSuspiciousContent(test.payload);

    // Check if XSS is still present in sanitized output
    const xssPresent = sanitized.includes('<script>') ||
                       sanitized.includes('javascript:') ||
                       sanitized.includes('onerror') ||
                       sanitized.includes('onclick') ||
                       sanitized.includes('onmouseover') ||
                       sanitized.includes('onfocus') ||
                       sanitized.includes('onload') ||
                       sanitized.includes('onmouseenter') ||
                       sanitized.includes('ontouchstart') ||
                       sanitized.includes('<iframe>') ||
                       sanitized.includes('<embed>') ||
                       sanitized.includes('<object>') ||
                       sanitized.includes('<svg>');

    let status;
    if (!xssPresent && !hasSuspicious) {
      status = colors.green + '✓ BLOCKED' + colors.reset;
      blocked++;
    } else if (sanitized !== test.payload) {
      status = colors.yellow + '⚠ PARTIAL' + colors.reset;
      partial++;
    } else {
      status = colors.red + '✗ BYPASSED' + colors.reset;
      bypassed++;
    }

    // Track by category
    if (!resultsByCategory[test.category]) {
      resultsByCategory[test.category] = { blocked: 0, bypassed: 0, partial: 0 };
    }
    if (!xssPresent && !hasSuspicious) {
      resultsByCategory[test.category].blocked++;
    } else if (sanitized !== test.payload) {
      resultsByCategory[test.category].partial++;
    } else {
      resultsByCategory[test.category].bypassed++;
    }

    console.log(`${colors.blue}Test ${index + 1}/${testPayloads.length}${colors.reset}: ${test.name}`);
    console.log(`  Category: ${test.category}`);
    console.log(`  Payload: ${test.payload}`);
    console.log(`  Sanitized: ${sanitized.substring(0, 100)}${sanitized.length > 100 ? '...' : ''}`);
    console.log(`  Status: ${status}`);
    console.log();
  });

  console.log(colors.blue + '='.repeat(80) + colors.reset);
  console.log(colors.blue + 'SUMMARY' + colors.reset);
  console.log(colors.blue + '='.repeat(80) + colors.reset);
  console.log(`Total Tests: ${testPayloads.length}`);
  console.log(`${colors.green}✓ Blocked: ${blocked}${colors.reset}`);
  console.log(`${colors.yellow}⚠ Partial: ${partial}${colors.reset}`);
  console.log(`${colors.red}✗ Bypassed: ${bypassed}${colors.reset}`);

  const passRate = ((blocked / testPayloads.length) * 100).toFixed(1);
  console.log();
  console.log(`Pass Rate: ${passRate}%`);

  console.log();
  console.log(colors.blue + 'Results by Category:' + colors.reset);
  Object.entries(resultsByCategory).forEach(([category, results]) => {
    const total = results.blocked + results.bypassed + results.partial;
    const categoryPassRate = ((results.blocked / total) * 100).toFixed(1);
    console.log(`  ${category}: ${results.blocked}/${total} blocked (${categoryPassRate}%)`);
  });

  console.log();

  // Critical bypasses
  if (bypassed > 0) {
    console.log(colors.red + 'CRITICAL: XSS payloads bypassed sanitization!' + colors.reset);
    console.log(colors.red + 'Recommendation: Upgrade to DOMPurify for production' + colors.reset);
  } else if (partial > 0) {
    console.log(colors.yellow + 'WARNING: Some XSS payloads partially sanitized' + colors.reset);
    console.log(colors.yellow + 'Recommendation: Review partial sanitization results' + colors.reset);
  } else {
    console.log(colors.green + 'SUCCESS: All XSS payloads blocked' + colors.reset);
  }

  console.log();
  console.log(colors.blue + '='.repeat(80) + colors.reset);

  return {
    blocked,
    bypassed,
    partial,
    passRate: parseFloat(passRate)
  };
}

// Run tests
const results = runTests();

// Exit with appropriate code
process.exit(results.bypassed > 0 ? 1 : 0);
