/**
 * Migration: Add Security Events Table
 * Security Audit Remediation (SEC-010)
 * Creates the security_events table for logging security-relevant events
 */

const { query } = require('../src/config/database');

async function up() {
  console.log('Creating security_events table...');
  
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS security_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        ip_address VARCHAR(45),
        user_id INT,
        user_agent VARCHAR(500),
        path VARCHAR(500),
        method VARCHAR(10),
        status_code INT,
        reason VARCHAR(500),
        additional_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_event_type (event_type),
        INDEX idx_ip_address (ip_address),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    console.log('✓ security_events table created successfully');
    
    try {
      await query(`
        ALTER TABLE security_events
        ADD CONSTRAINT fk_security_events_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('✓ Foreign key constraint added');
    } catch (fkError) {
      console.log('  Note: Could not add foreign key constraint (users table may not exist yet)');
    }
    
    return true;
  } catch (error) {
    console.error('Error creating security_events table:', error.message);
    throw error;
  }
}

async function down() {
  console.log('Dropping security_events table...');
  
  try {
    await query('DROP TABLE IF EXISTS security_events');
    console.log('✓ security_events table dropped successfully');
    return true;
  } catch (error) {
    console.error('Error dropping security_events table:', error.message);
    throw error;
  }
}

if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
