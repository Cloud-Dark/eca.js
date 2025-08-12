
// src/adapters/postgresql.js
class PostgreSQLAdapter {
  constructor(options = {}) {
    this.options = {
      host: options.host || 'localhost',
      port: options.port || 5432,
      user: options.user || 'postgres',
      password: options.password || '',
      database: options.database || 'cache_db',
      table: options.table || 'cache_store',
      ...options
    };
    
    this.client = null;
    this._connected = false;
    this._connect();
  }
  
  async _connect() {
    try {
      // Lazy load pg (optional dependency)
      const { Client } = require('pg');
      
      this.client = new Client({
        host: this.options.host,
        port: this.options.port,
        user: this.options.user,
        password: this.options.password,
        database: this.options.database
      });
      
      await this.client.connect();
      await this._createTable();
      this._connected = true;
    } catch (error) {
      throw new Error(`PostgreSQL connection failed: ${error.message}. Make sure to install pg: npm install pg`);
    }
  }
  
  async _createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.options.table} (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    await this.client.query(query);
  }
  
  async get(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(
        `SELECT value FROM ${this.options.table} WHERE key = $1`,
        [key]
      );
      
      return result.rows.length > 0 ? result.rows[0].value : undefined;
    } catch (error) {
      return undefined;
    }
  }
  
  async set(key, value) {
    if (!this._connected) await this._connect();
    
    try {
      await this.client.query(
        `INSERT INTO ${this.options.table} (key, value, updated_at) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (key) 
         DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
        [key, JSON.stringify(value)]
      );
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async delete(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(
        `DELETE FROM ${this.options.table} WHERE key = $1`,
        [key]
      );
      return result.rowCount > 0;
    } catch (error) {
      return false;
    }
  }
  
  async clear() {
    if (!this._connected) await this._connect();
    
    try {
      await this.client.query(`DELETE FROM ${this.options.table}`);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async keys() {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(`SELECT key FROM ${this.options.table}`);
      return result.rows.map(row => row.key);
    } catch (error) {
      return [];
    }
  }
  
  async size() {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(`SELECT COUNT(*) as count FROM ${this.options.table}`);
      return parseInt(result.rows[0].count);
    } catch (error) {
      return 0;
    }
  }
  
  async has(key) {
    if (!this._connected) await this._connect();
    
    try {
      const result = await this.client.query(
        `SELECT 1 FROM ${this.options.table} WHERE key = $1`,
        [key]
      );
      return result.rows.length > 0;
    } catch (error) {
      return false;
    }
  }
  
  async disconnect() {
    if (this.client && this._connected) {
      await this.client.end();
      this._connected = false;
    }
  }
}

module.exports = PostgreSQLAdapter;
