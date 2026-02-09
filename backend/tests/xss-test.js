/**
 * XSS Sanitization Test
 * Testing sanitize.js against encoded payloads
 */

const { sanitizeString, sanitizeInput } = require('../src/utils/sanitize');

const testPayloads = [
    { name: 'Basic Script Tag', payload: '<script>alert(1)</script>' },
    { name: 'Case Variation', payload: '<Script>alert(1)</Script>' },
    { name: 'HTML Entity Encoding', payload: '&#x3C;script&#x3E;alert(1)&#x3C;/script&#x3E;' },
    { name: 'HTML Entity (Named)', payload: '&lt;script&gt;alert(1)&lt;/script&gt;' },
    { name: 'JavaScript URL (Encoded)', payload: 'javas&#99;ript:alert(1)' },
    { name: 'JavaScript URL (Hex)', payload: '&#x6A;avascript:alert(1)' },
    { name: 'SVG Onload', payload: '<svg onload=alert(1)>' },
    { name: 'SVG (Encoded)', payload: '&#x3C;svg onload=alert(1)&#x3E;' },
    { name: 'IMG Onerror', payload: '<img src=x onerror=alert(1)>' },
    { name: 'IMG Onerror (Encoded)', payload: '<img src=x onerror="&#x61;l&#x65;rt(1)">' },
    { name: 'CSS Expression', payload: '<div style="background:expression(alert(1))">XSS</div>' },
    { name: 'Event Handler', payload: '<div onmouseenter=alert(1)>XSS</div>' },
    { name: 'Data URI', payload: '<a href="data:text/html,<script>alert(1)</script>">Click</a>' },
    { name: 'Unicode Escape', payload: '\u003Cscript\u003Ealert(1)\u003C/script\u003E' },
    { name: 'Protocol With Space', payload: 'java script:alert(1)' },
    { name: 'Protocol With Tab', payload: 'java\tscript:alert(1)' },
    { name: 'Protocol With Newline', payload: 'java\nscript:alert(1)' },
    { name: 'Backtick Event', payload: '<img src=x onerror=`alert(1)`>' },
    { name: 'Double Encoded', payload: '&amp;lt;script&amp;gt;alert(1)&amp;lt;/script&amp;gt;' },
];

console.log('XSS SANITIZATION TEST RESULTS\n');
console.log('='.repeat(80));

let passed = 0;
let failed = 0;

testPayloads.forEach(({ name, payload }) => {
    const result = sanitizeString(payload);
    
    const isSafe = (output) => {
        if (output.includes('<script')) return false;
        if (output.includes('<svg')) return false;
        if (output.includes('<img') && output.includes('onerror')) return false;
        if (output.includes('javascript:')) return false;
        if (output.includes('onload=')) return false;
        if (output.includes('onerror=')) return false;
        if (output.includes('onmouseenter=')) return false;
        if (output.includes('expression(')) return false;
        return true;
    };
    
    const safe = isSafe(result);
    
    if (safe) {
        passed++;
        console.log(`\x1b[32m[PASS]\x1b[0m ${name}`);
    } else {
        failed++;
        console.log(`\x1b[31m[BYPASS]\x1b[0m ${name}`);
    }
    
    console.log(`  Input:  ${payload}`);
    console.log(`  Output: ${result}`);
    console.log('');
});

console.log('='.repeat(80));
console.log(`\nRESULTS: ${passed} PASSED / ${failed} BYPASSED`);
console.log(`Security Score: ${Math.round((passed / testPayloads.length) * 100)}%`);

if (failed > 0) {
    console.log('\n\x1b[31mRECOMMENDATION: Upgrade to DOMPurify\x1b[0m');
    console.log('Current regex-based approach has known bypasses.');
    console.log('DOMPurify handles all encoding variants and is continuously updated.');
}
