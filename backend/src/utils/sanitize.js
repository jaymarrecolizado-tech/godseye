/**
 * Input Sanitization Utility
 * Security Audit Remediation (SEC-014)
 * Prevents XSS attacks by sanitizing user input
 */

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /data:\s*text\/html/gi,
  /vbscript:/gi,
  /expression\s*\(/gi,
  /<embed/gi,
  /<object/gi,
  /<applet/gi,
  /<meta/gi,
  /<link/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /<svg/gi,
  /<math/gi,
  /@import/gi,
  /url\s*\(/gi
];

const DANGEROUS_ATTRS = [
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onkeydown',
  'onkeyup',
  'onfocus',
  'onblur',
  'onsubmit',
  'onchange',
  'oninput',
  'onscroll',
  'onresize'
];

const sanitizeString = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  for (const attr of DANGEROUS_ATTRS) {
    const attrPattern = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(attrPattern, '');
    const attrPatternNoQuotes = new RegExp(`${attr}\\s*=\\s*[^\\s>]+`, 'gi');
    sanitized = sanitized.replace(attrPatternNoQuotes, '');
  }

  sanitized = sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
};

const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item));
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeInput(value);
    }
    return sanitized;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  return obj;
};

const sanitizeInput = (input) => {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    return sanitizeObject(input);
  }

  return input;
};

const sanitizeHTML = (input, allowedTags = []) => {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  for (const attr of DANGEROUS_ATTRS) {
    const attrPattern = new RegExp(`${attr}\\s*=\\s*["'][^"']*["']`, 'gi');
    sanitized = sanitized.replace(attrPattern, '');
  }

  if (allowedTags.length === 0) {
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  } else {
    const tagPattern = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;
    sanitized = sanitized.replace(tagPattern, (match, tagName) => {
      if (allowedTags.includes(tagName.toLowerCase())) {
        return match;
      }
      return '';
    });
  }

  return sanitized;
};

const hasSuspiciousContent = (input) => {
  if (typeof input !== 'string') {
    return false;
  }

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      return true;
    }
  }

  return false;
};

const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') {
    return '';
  }

  return filename
    .replace(/^[=+\-@]/g, '_')
    .replace(/[<>"|*?:\\\/]/g, '_')
    .replace(/\.\./g, '')
    .replace(/[^\w\s.-]/gi, '_')
    .replace(/\s+/g, '_')
    .substring(0, 255);
};

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }

  if (req.query) {
    req.query = sanitizeInput(req.query);
  }

  if (req.params) {
    req.params = sanitizeInput(req.params);
  }

  next();
};

module.exports = {
  sanitizeInput,
  sanitizeString,
  sanitizeObject,
  sanitizeHTML,
  sanitizeFilename,
  hasSuspiciousContent,
  sanitizeMiddleware
};
