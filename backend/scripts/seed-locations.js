/**
 * Seed Locations Script
 * Seeds the correct locations and updates project types for the import
 */

const { query, transaction, getConnection } = require('../src/config/database');

async function seedLocations() {
    console.log('='.repeat(60));
    console.log('Seeding Locations and Updating Project Types');
    console.log('='.repeat(60));
    console.log();

    let connection;
    try {
        connection = await getConnection();
        await connection.beginTransaction();

        // Insert Batanes if not exists
        console.log('Step 1: Adding provinces...');
        await connection.query(`
            INSERT IGNORE INTO provinces (name, region_code, created_at, updated_at) 
            VALUES ('Batanes', '02', NOW(), NOW())
        `);
        
        await connection.query(`
            INSERT IGNORE INTO provinces (name, region_code, created_at, updated_at) 
            VALUES ('Cagayan', '02', NOW(), NOW())
        `);
        
        // Get province IDs
        const [batanesRows] = await connection.query('SELECT id FROM provinces WHERE name = ?', ['Batanes']);
        const [cagayanRows] = await connection.query('SELECT id FROM provinces WHERE name = ?', ['Cagayan']);
        
        const batanesId = batanesRows[0]?.id;
        const cagayanId = cagayanRows[0]?.id;
        
        console.log(`  ✓ Batanes ID: ${batanesId}`);
        console.log(`  ✓ Cagayan ID: ${cagayanId}`);
        
        if (!batanesId || !cagayanId) {
            throw new Error('Failed to get province IDs');
        }
        
        // Insert districts
        console.log();
        console.log('Step 2: Adding districts...');
        
        await connection.query(`
            INSERT IGNORE INTO districts (province_id, name, district_code, created_at) 
            VALUES (?, 'District I', 'BTN-D1', NOW())
        `, [batanesId]);
        
        await connection.query(`
            INSERT IGNORE INTO districts (province_id, name, district_code, created_at) 
            VALUES (?, 'District III', 'CAG-D3', NOW())
        `, [cagayanId]);
        
        // Get district IDs
        const [district1Rows] = await connection.query('SELECT id FROM districts WHERE province_id = ? AND name = ?', [batanesId, 'District I']);
        const [district3Rows] = await connection.query('SELECT id FROM districts WHERE province_id = ? AND name = ?', [cagayanId, 'District III']);
        
        const district1Id = district1Rows[0]?.id;
        const district3Id = district3Rows[0]?.id;
        
        console.log(`  ✓ District I (Batanes) ID: ${district1Id}`);
        console.log(`  ✓ District III (Cagayan) ID: ${district3Id}`);
        
        // Insert municipalities
        console.log();
        console.log('Step 3: Adding municipalities...');
        
        await connection.query(`
            INSERT IGNORE INTO municipalities (province_id, district_id, name, municipality_code, created_at) 
            VALUES (?, ?, 'Itbayat', 'BTN-ITB', NOW())
        `, [batanesId, district1Id]);
        
        await connection.query(`
            INSERT IGNORE INTO municipalities (province_id, district_id, name, municipality_code, created_at) 
            VALUES (?, ?, 'Ivana', 'BTN-IVN', NOW())
        `, [batanesId, district1Id]);
        
        await connection.query(`
            INSERT IGNORE INTO municipalities (province_id, district_id, name, municipality_code, created_at) 
            VALUES (?, ?, 'Iguig', 'CAG-IGG', NOW())
        `, [cagayanId, district3Id]);
        
        // Get municipality IDs
        const [itbayatRows] = await connection.query('SELECT id FROM municipalities WHERE name = ?', ['Itbayat']);
        const [ivanaRows] = await connection.query('SELECT id FROM municipalities WHERE name = ?', ['Ivana']);
        const [iguigRows] = await connection.query('SELECT id FROM municipalities WHERE name = ?', ['Iguig']);
        
        const itbayatId = itbayatRows[0]?.id;
        const ivanaId = ivanaRows[0]?.id;
        const iguigId = iguigRows[0]?.id;
        
        console.log(`  ✓ Itbayat ID: ${itbayatId}`);
        console.log(`  ✓ Ivana ID: ${ivanaId}`);
        console.log(`  ✓ Iguig ID: ${iguigId}`);
        
        // Insert barangays
        console.log();
        console.log('Step 4: Adding barangays...');
        
        // Itbayat barangays
        await connection.query(`
            INSERT IGNORE INTO barangays (municipality_id, name, barangay_code, created_at) 
            VALUES (?, 'Raele', 'BTN-ITB-RLE', NOW())
        `, [itbayatId]);
        
        await connection.query(`
            INSERT IGNORE INTO barangays (municipality_id, name, barangay_code, created_at) 
            VALUES (?, 'Santa Lucia', 'BTN-ITB-SLU', NOW())
        `, [itbayatId]);
        
        await connection.query(`
            INSERT IGNORE INTO barangays (municipality_id, name, barangay_code, created_at) 
            VALUES (?, 'Santa Maria', 'BTN-ITB-SMA', NOW())
        `, [itbayatId]);
        
        // Ivana barangays
        await connection.query(`
            INSERT IGNORE INTO barangays (municipality_id, name, barangay_code, created_at) 
            VALUES (?, 'Salagao', 'BTN-IVN-SLG', NOW())
        `, [ivanaId]);
        
        // Iguig barangays
        await connection.query(`
            INSERT IGNORE INTO barangays (municipality_id, name, barangay_code, created_at) 
            VALUES (?, 'Ajat', 'CAG-IGG-AJT', NOW())
        `, [iguigId]);
        
        console.log('  ✓ Barangays added: Raele, Santa Lucia, Santa Maria, Salagao, Ajat');
        
        // Update project types with correct code prefixes
        console.log();
        console.log('Step 5: Updating project types...');
        
        await connection.query(`
            UPDATE project_types 
            SET code_prefix = 'UNDP', name = 'Free-WIFI for All'
            WHERE code_prefix = 'WF' OR name LIKE '%WiFi%' OR name LIKE '%WIFI%'
        `);
        
        await connection.query(`
            UPDATE project_types 
            SET code_prefix = 'CYBER', name = 'PNPKI/CYBER'
            WHERE code_prefix = 'PK' OR name LIKE '%PNPKI%'
        `);
        
        await connection.query(`
            UPDATE project_types 
            SET code_prefix = 'IIDB', name = 'IIDB'
            WHERE code_prefix = 'ID' OR name LIKE '%IIDB%'
        `);
        
        await connection.query(`
            UPDATE project_types 
            SET code_prefix = 'eLGU', name = 'DigiGov-eLGU'
            WHERE code_prefix = 'EL' OR name LIKE '%eLGU%' OR name LIKE '%DigiGov%'
        `);
        
        console.log('  ✓ Project types updated');
        
        await connection.commit();

        console.log();
        console.log('='.repeat(60));
        console.log('Seeding Complete');
        console.log('='.repeat(60));
        console.log();
        
        // Verify the data
        const provinces = await query('SELECT id, name FROM provinces');
        const projectTypes = await query('SELECT id, name, code_prefix FROM project_types');
        
        console.log('Provinces in database:');
        provinces.forEach(p => console.log(`  - ${p.name} (ID: ${p.id})`));
        
        console.log();
        console.log('Project types:');
        projectTypes.forEach(pt => console.log(`  - ${pt.name} (Prefix: ${pt.code_prefix})`));
        console.log();

        return { success: true };

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error();
        console.error('✗ Error seeding locations:');
        console.error('  ', error.message);
        console.error();
        
        return { success: false, error: error.message };
    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Run the script if called directly
if (require.main === module) {
    seedLocations()
        .then(result => {
            if (!result.success) {
                process.exit(1);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { seedLocations };
