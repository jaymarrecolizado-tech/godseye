/**
 * Centralized Authentication Configuration
 * All authentication-related configuration in one place
 * Security: JWT_SECRET is required - no fallback values
 */

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required. Set it in your .env file.');
}

if (JWT_SECRET.length < 32) {
  throw new Error('FATAL: JWT_SECRET must be at least 32 characters long for security. Generate a secure secret using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  
  PASSWORD_MIN_LENGTH: parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 12,
  PASSWORD_MAX_LENGTH: parseInt(process.env.PASSWORD_MAX_LENGTH, 10) || 128,
  
  MAX_FAILED_ATTEMPTS: parseInt(process.env.MAX_FAILED_ATTEMPTS, 10) || 5,
  LOCKOUT_DURATION_MINUTES: parseInt(process.env.LOCKOUT_DURATION_MINUTES, 10) || 30,
  
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  RATE_LIMIT_MAX_ATTEMPTS: parseInt(process.env.RATE_LIMIT_MAX_ATTEMPTS, 10) || 5,
  
  CSRF_COOKIE_SECURE: process.env.NODE_ENV === 'production',
  CSRF_COOKIE_SAME_SITE: 'strict'
};
