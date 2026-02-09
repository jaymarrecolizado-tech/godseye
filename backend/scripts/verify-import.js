/**
 * Verify Import Script
 * Verifies the imported data and shows summary
 */

const { query } = require('../src/config/database');

async function verifyImport() {
    console.log('='.repeat(60));
    console.log('Import Verification Report');
    console.log('='.repeat(60));
    console.log();

    try {
        // Get total count
        const countResult = await query('SELECT COUNT(*) as count FROM project_sites');
        const totalProjects = countResult[0]?.count || 0;
        
        console.log(`Total Projects in Database: ${totalProjects}`);
        console.log();

        // Get projects by status
        const statusCounts = await query(`
            SELECT status, COUNT(*) as count 
            FROM project_sites 
            GROUP BY status
        `);
        
        console.log('Projects by Status:');
        statusCounts.forEach(row => {
            console.log(`  - ${row.status}: ${row.count}`);
        });
        console.log();

        // Get projects by project type
        const typeCounts = await query(`
            SELECT pt.name, COUNT(*) as count 
            FROM project_sites ps
            JOIN project_types pt ON ps.project_type_id = pt.id
            GROUP BY pt.name
        `);
        
        console.log('Projects by Type:');
        typeCounts.forEach(row => {
            console.log(`  - ${row.name}: ${row.count}`);
        });
        console.log();

        // Get projects by province
        const provinceCounts = await query(`
            SELECT p.name, COUNT(*) as count 
            FROM project_sites ps
            JOIN provinces p ON ps.province_id = p.id
            GROUP BY p.name
        `);
        
        console.log('Projects by Province:');
        provinceCounts.forEach(row => {
            console.log(`  - ${row.name}: ${row.count}`);
        });
        console.log();

        // Show all imported projects
        const projects = await query(`
            SELECT 
                ps.site_code,
                ps.site_name,
                pt.name as project_type,
                p.name as province,
                m.name as municipality,
                b.name as barangay,
                ps.latitude,
                ps.longitude,
                ps.status,
                ps.activation_date
            FROM project_sites ps
            JOIN project_types pt ON ps.project_type_id = pt.id
            JOIN provinces p ON ps.province_id = p.id
            JOIN municipalities m ON ps.municipality_id = m.id
            LEFT JOIN barangays b ON ps.barangay_id = b.id
            ORDER BY ps.site_code
        `);

        console.log('All Imported Projects:');
        console.log('-'.repeat(100));
        console.log(
            'Site Code'.padEnd(15) + 
            'Project Type'.padEnd(20) + 
            'Location'.padEnd(30) + 
            'Status'.padEnd(12) + 
            'Coordinates'
        );
        console.log('-'.repeat(100));

        projects.forEach(p => {
            const location = `${p.municipality}, ${p.province}`;
            const coords = `${p.latitude}, ${p.longitude}`;
            console.log(
                p.site_code.padEnd(15) + 
                (p.project_type || '').padEnd(20) + 
                location.padEnd(30) + 
                p.status.padEnd(12) + 
                coords
            );
        });

        console.log();
        console.log('='.repeat(60));
        console.log('Verification Complete');
        console.log('='.repeat(60));

        return {
            success: true,
            totalProjects,
            statusCounts,
            typeCounts,
            provinceCounts,
            projects
        };

    } catch (error) {
        console.error('✗ Verification failed:', error.message);
        return { success: false, error: error.message };
    }
}

// Run the script if called directly
if (require.main === module) {
    verifyImport()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { verifyImport };
