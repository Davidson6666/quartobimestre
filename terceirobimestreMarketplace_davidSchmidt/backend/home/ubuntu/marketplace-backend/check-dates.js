require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

async function checkDates() {
  try {
    const result = await pool.query(`
      SELECT 
        TO_CHAR(data_venda, 'YYYY-MM') as mes, 
        COUNT(*) as quantidade,
        MIN(data_venda) as primeira_venda,
        MAX(data_venda) as ultima_venda
      FROM vendas 
      GROUP BY TO_CHAR(data_venda, 'YYYY-MM') 
      ORDER BY mes DESC 
      LIMIT 12;
    `);

    console.log('\n✅ Datas das vendas no banco:');
    console.table(result.rows);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

checkDates();
