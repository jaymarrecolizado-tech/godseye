/**
 * Clear Project Data Script
 * Removes all existing records from project_sites, accomplishments, and csv_imports tables
 * while preserving table structure
 */

const { query, transaction } = require('../src/config/database');

async function clearProjectData() {
    console.log('='.repeat(60));
    console.log('Clearing Existing Project Data');
    console.log('='.repeat(60));
    console.log();

    try {
        // Get counts before deletion
        console.log('Getting current record counts...');
        
        const [projectSitesCount] = await query('SELECT COUNT(*) as count FROM project_sites');
        const [accomplishmentsCount] = await query('SELECT COUNT(*) as count FROM accomplishments');
        const [csvImportsCount] = await query('SELECT COUNT(*) as count FROM csv_imports');

        console.log(`Current records:`);
        console.log(`  - project_sites: ${projectSitesCount.count}`);
        console.log(`  - accomplishments: ${accomplishmentsCount.count}`);
        console.log(`  - csv_imports: ${csvImportsCount.count}`);
        console.log();

        // Use transaction to ensure all deletions succeed or fail together
        await transaction(async (connection) => {
            console.log('Starting data deletion...');
            console.log();

            // Delete from accomplishments first (child table with foreign keys)
            console.log('  → Deleting from accomplishments table...');
            const [accomResult] = await connection.query('DELETE FROM accomplishments');
            console.log(`    ✓ Deleted ${accomResult.affectedRows} records`);

            // Delete from csv_imports
            console.log('  → Deleting from csv_imports table...');
            const [csvResult] = await connection.query('DELETE FROM csv_imports');
            console.log(`    ✓ Deleted ${csvResult.affectedRows} records`);

            // Delete from project_sites last (parent table with foreign key references)
            console.log('  → Deleting from project_sites table...');
            const [projectResult] = await connection.query('DELETE FROM project_sites');
            console.log(`    ✓ Deleted ${projectResult.affectedRows} records`);

            // Reset auto-increment counters (optional)
            console.log('  → Resetting auto-increment counters...');
            await connection.query('ALTER TABLE accomplishments AUTO_INCREMENT = 1');
            await connection.query('ALTER TABLE csv_imports AUTO_INCREMENT = 1');
            await connection.query('ALTER TABLE project_sites AUTO_INCREMENT = 1');
            console.log('    ✓ Auto-increment counters reset');
        });

        console.log();
        console.log('='.repeat(60));
        console.log('Data Cleared Successfully');
        console.log('='.repeat(60));
        console.log();
        console.log('Summary:');
        console.log(`  - project_sites: ${projectSitesCount.count} records deleted`);
        console.log(`  - accomplishments: ${accomplishmentsCount.count} records deleted`);
        console.log(`  - csv_imports: ${csvImportsCount.count} records deleted`);
        console.log();
        console.log('All project data has been cleared. Tables are ready for new imports.');
        console.log();

        return {
            success: true,
            deleted: {
                projectSites: projectSitesCount.count,
                accomplishments: accomplishmentsCount.count,
                csvImports: csvImportsCount.count
            }
        };

    } catch (error) {
        console.error();
        console.error('✗ Error clearing project data:');
        console.error('  ', error.message);
        console.error();
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the script if called directly
if (require.main === module) {
    clearProjectData()
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

module.exports = { clearProjectData };
