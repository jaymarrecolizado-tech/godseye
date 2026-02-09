/**
 * Refresh Token Storage Utility
 * Security Audit Remediation (HIGH-004)
 * Manages refresh token persistence in database
 */

const { query } = require('../config/database');
const crypto = require('crypto');

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const storeRefreshToken = async (userId, refreshToken, expiresIn) => {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + expiresIn);
  
  const result = await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, last_used_at)
     VALUES (?, ?, ?, NOW())`,
    [userId, tokenHash, expiresAt]
  );
  
  return result.insertId;
};

const validateRefreshToken = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  
  const tokens = await query(
    `SELECT rt.*, u.username, u.email, u.full_name, u.role, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token_hash = ? AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
    [tokenHash]
  );
  
  if (!tokens || tokens.length === 0) {
    return null;
  }
  
  const token = tokens[0];
  
  await query(
    `UPDATE refresh_tokens SET last_used_at = NOW() WHERE id = ?`,
    [token.id]
  );
  
  return token;
};

const revokeRefreshToken = async (refreshToken) => {
  const tokenHash = hashToken(refreshToken);
  
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ?`,
    [tokenHash]
  );
};

const revokeAllUserTokens = async (userId) => {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`,
    [userId]
  );
};

const cleanupExpiredTokens = async () => {
  await query(
    `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(NOW(), INTERVAL 7 DAY))`
  );
};

module.exports = {
  hashToken,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  cleanupExpiredTokens
};
