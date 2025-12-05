const fs = require('fs');
console.log('Existe .env?', fs.existsSync('./.env'));
require('dotenv').config();
console.log('DB_USER:', process.env.DB_USER);

const { Pool } = require("pg");

class Database {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT,
      max: 20, // Máximo de conexões no pool
      idleTimeoutMillis: 30000, // Tempo limite para conexões inativas
      connectionTimeoutMillis: 2000, // Tempo limite para estabelecer conexão
    });

    this.pool.on("error", (err) => {
      console.error("Erro inesperado no pool de conexões:", err);
      process.exit(-1);
    });
  }

  /**
   * Executa uma query no banco de dados
   * @param {string} text - Query SQL
   * @param {Array} params - Parâmetros da query
   * @returns {Promise} - Resultado da query
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log("Query executada:", { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error("Erro na query:", { text, error: error.message });
      throw error;
    }
  }

  /**
   * Executa uma transação
   * @param {Function} callback - Função que contém as queries da transação
   * @returns {Promise} - Resultado da transação
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Testa a conexão com o banco de dados
   * @returns {Promise<boolean>} - True se a conexão for bem-sucedida
   */
  async testConnection() {
    try {
      const result = await this.query("SELECT NOW() as now");
      console.log(
        "Conexão com PostgreSQL estabelecida em:",
        result.rows[0].now
      );
      return true;
    } catch (error) {
      console.error("Erro ao testar conexão:", error.message);
      return false;
    }
  }

  /**
   * Fecha todas as conexões do pool
   */
  async close() {
    await this.pool.end();
    console.log("Pool de conexões fechado");
  }

  /**
   * Obtém estatísticas do pool de conexões
   * @returns {Object} - Estatísticas do pool
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

module.exports = new Database();
