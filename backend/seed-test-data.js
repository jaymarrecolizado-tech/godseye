/**
 * Seed test data for report filtering tests
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'project_tracking',
  multipleStatements: true
};

async function seedData() {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('Connected to database. Seeding test data...\n');
    
    // Insert provinces
    console.log('Inserting provinces...');
    await connection.query(`
      INSERT INTO provinces (id, name, region_code) VALUES
      (1, 'Metro Manila', 'NCR'),
      (2, 'Cebu', 'VII'),
      (3, 'Davao del Sur', 'XI')
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);
    
    // Insert districts
    console.log('Inserting districts...');
    await connection.query(`
      INSERT INTO districts (id, province_id, name, district_code) VALUES
      (1, 1, 'Manila District 1', 'MNL-D1'),
      (2, 1, 'Manila District 2', 'MNL-D2'),
      (3, 2, 'Cebu City District 1', 'CEB-D1'),
      (4, 3, 'Davao City District 1', 'DAV-D1')
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);
    
    // Insert municipalities
    console.log('Inserting municipalities...');
    await connection.query(`
      INSERT INTO municipalities (id, province_id, district_id, name, municipality_code) VALUES
      (1, 1, 1, 'Manila', 'MNL'),
      (2, 1, 1, 'Quezon City', 'QC'),
      (3, 1, 2, 'Makati', 'MKTI'),
      (4, 2, 3, 'Cebu City', 'CEB'),
      (5, 2, 3, 'Mandaue', 'MND'),
      (6, 3, 4, 'Davao City', 'DAV')
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);
    
    // Insert barangays
    console.log('Inserting barangays...');
    await connection.query(`
      INSERT INTO barangays (id, municipality_id, name, barangay_code) VALUES
      (1, 1, 'Barangay 1', 'BRGY1'),
      (2, 1, 'Barangay 2', 'BRGY2'),
      (3, 2, 'Batasan Hills', 'BHN'),
      (4, 2, 'Commonwealth', 'CMW'),
      (5, 3, 'Poblacion', 'POB'),
      (6, 4, 'Lahug', 'LAH'),
      (7, 4, 'Mabolo', 'MAB'),
      (8, 6, 'Buhangin', 'BUH'),
      (9, 6, 'Talomo', 'TAL')
      ON DUPLICATE KEY UPDATE name = VALUES(name);
    `);
    
    // Get project type IDs
    const [projectTypes] = await connection.query('SELECT id, name FROM project_types');
    const typeMap = {};
    projectTypes.forEach(t => typeMap[t.name] = t.id);
    
    // Insert sample projects
    console.log('Inserting sample projects...');
    const projects = [
      // Metro Manila projects
      { code: 'WF-MM-001', name: 'Manila Free WiFi Site 1', type: 'Free-WIFI for All', province: 1, municipality: 1, barangay: 1, status: 'Done', date: '2024-03-15' },
      { code: 'WF-MM-002', name: 'Manila Free WiFi Site 2', type: 'Free-WIFI for All', province: 1, municipality: 1, barangay: 2, status: 'In Progress', date: '2024-06-20' },
      { code: 'WF-MM-003', name: 'QC WiFi Hotspot', type: 'Free-WIFI for All', province: 1, municipality: 2, barangay: 3, status: 'Pending', date: '2024-08-10' },
      { code: 'PK-MM-001', name: 'Manila PNPKI Center', type: 'PNPKI', province: 1, municipality: 1, barangay: 1, status: 'Done', date: '2024-02-28' },
      { code: 'PK-MM-002', name: 'Makati PNPKI Site', type: 'PNPKI', province: 1, municipality: 3, barangay: 5, status: 'In Progress', date: '2024-07-15' },
      { code: 'ID-MM-001', name: 'Manila IIDB Installation', type: 'IIDB', province: 1, municipality: 1, barangay: 2, status: 'Done', date: '2024-01-20' },
      { code: 'EL-MM-001', name: 'Quezon City eLGU', type: 'eLGU', province: 1, municipality: 2, barangay: 4, status: 'On Hold', date: '2024-05-30' },
      
      // Cebu projects
      { code: 'WF-CE-001', name: 'Cebu City Free WiFi', type: 'Free-WIFI for All', province: 2, municipality: 4, barangay: 6, status: 'Done', date: '2024-04-10' },
      { code: 'WF-CE-002', name: 'Mandaue WiFi Zone', type: 'Free-WIFI for All', province: 2, municipality: 5, barangay: 7, status: 'In Progress', date: '2024-09-05' },
      { code: 'PK-CE-001', name: 'Cebu PNPKI Office', type: 'PNPKI', province: 2, municipality: 4, barangay: 6, status: 'Done', date: '2024-03-25' },
      { code: 'ID-CE-001', name: 'Cebu IIDB Setup', type: 'IIDB', province: 2, municipality: 4, barangay: 7, status: 'Pending', date: '2024-10-12' },
      
      // Davao projects
      { code: 'WF-DV-001', name: 'Davao City Free WiFi', type: 'Free-WIFI for All', province: 3, municipality: 6, barangay: 8, status: 'Done', date: '2024-06-01' },
      { code: 'WF-DV-002', name: 'Talomo WiFi Hub', type: 'Free-WIFI for All', province: 3, municipality: 6, barangay: 9, status: 'In Progress', date: '2024-08-20' },
      { code: 'PK-DV-001', name: 'Davao PNPKI Hub', type: 'PNPKI', province: 3, municipality: 6, barangay: 8, status: 'Cancelled', date: '2024-04-15' },
      { code: 'EL-DV-001', name: 'Davao eLGU Project', type: 'eLGU', province: 3, municipality: 6, barangay: 9, status: 'Pending', date: '2024-11-01' }
    ];
    
    for (const p of projects) {
      const typeId = typeMap[p.type];
      if (!typeId) {
        console.log(`Warning: Project type '${p.type}' not found, skipping ${p.code}`);
        continue;
      }
      
      await connection.query(`
        INSERT INTO project_sites 
        (site_code, site_name, project_type_id, province_id, municipality_id, barangay_id, status, activation_date, latitude, longitude, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE 
        site_name = VALUES(site_name),
        status = VALUES(status),
        activation_date = VALUES(activation_date)
      `, [
        p.code, p.name, typeId, p.province, p.municipality, p.barangay, 
        p.status, p.date, 
        14.0 + Math.random() * 4, // Random latitude around Philippines
        120.0 + Math.random() * 10 // Random longitude around Philippines
      ]);
    }
    
    // Get count of inserted projects
    const [countResult] = await connection.query('SELECT COUNT(*) as count FROM project_sites');
    console.log(`\n✓ Successfully seeded ${countResult[0].count} projects`);
    
    // Show breakdown by status
    const [statusBreakdown] = await connection.query(`
      SELECT status, COUNT(*) as count FROM project_sites GROUP BY status ORDER BY count DESC
    `);
    console.log('\nStatus breakdown:');
    statusBreakdown.forEach(s => console.log(`  ${s.status}: ${s.count}`));
    
    // Show breakdown by province
    const [provinceBreakdown] = await connection.query(`
      SELECT p.name, COUNT(*) as count 
      FROM project_sites ps 
      JOIN provinces p ON ps.province_id = p.id 
      GROUP BY p.name 
      ORDER BY count DESC
    `);
    console.log('\nProvince breakdown:');
    provinceBreakdown.forEach(p => console.log(`  ${p.name}: ${p.count}`));
    
    console.log('\n✓ Test data seeding complete!');
    
  } catch (error) {
    console.error('Error seeding data:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

seedData().catch(console.error);
