/**
 * Debug query parameter binding
 */

const { query } = require('./src/config/database');

async function testQueries() {
  try {
    console.log('Testing basic query...');
    const result1 = await query('SELECT COUNT(*) as count FROM project_sites');
    console.log('✓ Basic query works:', result1[0].count);

    console.log('\nTesting query with params...');
    const result2 = await query('SELECT COUNT(*) as count FROM project_sites WHERE status = ?', ['Done']);
    console.log('✓ Query with params works:', result2[0].count);

    console.log('\nTesting query with multiple params...');
    const result3 = await query(
      'SELECT COUNT(*) as count FROM project_sites WHERE status = ? AND province_id = ?', 
      ['Done', 1]
    );
    console.log('✓ Query with multiple params works:', result3[0].count);

    console.log('\nTesting query with IN clause...');
    const result4 = await query(
      'SELECT COUNT(*) as count FROM project_sites WHERE status IN (?, ?)', 
      ['Done', 'Pending']
    );
    console.log('✓ Query with IN clause works:', result4[0].count);

    console.log('\nTesting query with date params...');
    const result5 = await query(
      'SELECT COUNT(*) as count FROM project_sites WHERE activation_date >= ? AND activation_date <= ?', 
      ['2024-01-01', '2024-12-31']
    );
    console.log('✓ Query with date params works:', result5[0].count);

    console.log('\nTesting complex query like getCustomReport...');
    const whereClause = 'WHERE 1=1 AND ps.status = ?';
    const params = ['Done'];
    const sql = `
      SELECT 
        p.id as group_id,
        p.name as group_name,
        COUNT(*) as total
      FROM project_sites ps
      JOIN provinces p ON ps.province_id = p.id
      ${whereClause}
      GROUP BY p.id, p.name
      LIMIT ?
    `;
    const result6 = await query(sql, [...params, 10]);
    console.log('✓ Complex query works:', result6.length, 'groups');

    console.log('\n✓ All query tests passed!');
  } catch (error) {
    console.error('✗ Query test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testQueries();
