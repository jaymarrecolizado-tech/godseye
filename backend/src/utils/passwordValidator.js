/**
 * Password Validation Utility
 * Security Audit Remediation (MEDIUM-001)
 * Validates password strength against NIST recommendations
 */

const authConfig = require('../config/auth');

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', 'master', 'dragon', 'letmein', 'login',
  'princess', 'solo', 'starwars', 'passw0rd', 'admin',
  'welcome', 'football', 'shadow', 'mustang', 'superman'
];

const validatePasswordStrength = (password, username = null, email = null) => {
  const { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } = authConfig;

  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters`;
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!(hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar)) {
    return 'Password must contain uppercase, lowercase, numbers, and special characters';
  }

  if (username && password.toLowerCase().includes(username.toLowerCase())) {
    return 'Password cannot contain your username';
  }

  if (email) {
    const emailLocal = email.split('@')[0];
    if (password.toLowerCase().includes(emailLocal.toLowerCase())) {
      return 'Password cannot contain your email username';
    }
  }

  if (COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common))) {
    return 'Password is too common. Choose a stronger password.';
  }

  const hasRepeatingChars = /(.)\1{2,}/.test(password);
  if (hasRepeatingChars) {
    return 'Password contains repeating characters. Choose a more complex password.';
  }

  const hasSequentialChars = /(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password);
  if (hasSequentialChars) {
    return 'Password contains sequential characters. Choose a more complex password.';
  }

  return null;
};

const calculatePasswordStrength = (password) => {
  let score = 0;

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  if (!/(.)\1{2,}/.test(password)) score += 1;

  if (score <= 3) return 'weak';
  if (score <= 5) return 'medium';
  return 'strong';
};

module.exports = {
  validatePasswordStrength,
  calculatePasswordStrength
};
