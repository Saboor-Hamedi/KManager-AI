import { Pool } from 'pg'

class Database {
  constructor(config = {}) {
    this.config = {
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || '',
      user: config.user || '',
      password: config.password || '',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    }
    this.pool = null
    this.isEnding = false
  }

  async connect() {
    try {
      this.pool = new Pool(this.config)
      const client = await this.pool.connect()
      const res = await client.query('SELECT 1 AS connected')
      client.release()
      return { success: true, message: 'Connected successfully' }
    } catch (err) {
      this.pool = null
      this.isEnding = false
      return { success: false, message: err.message }
    }
  }

  async disconnect() {
    if (this.pool && !this.isEnding) {
      this.isEnding = true
      try {
        await this.pool.end()
      } catch (e) {
        // Ignore errors during tear down
      }
      this.pool = null
      this.isEnding = false
    }
  }

  async query(text, params = []) {
    if (!this.pool || this.isEnding) {
      throw new Error('Not connected to database')
    }
    
    let client;
    try {
      client = await this.pool.connect()
    } catch (err) {
      if (err.message.includes('calling end on the pool')) {
        throw new Error('Not connected to database')
      }
      throw err
    }

    try {
      const res = await client.query(text, params)
      return res
    } finally {
      client.release()
    }
  }

  /**
   * Executes a callback within a managed database transaction using a single client.
   * The callback receives a `client` object which it should use for queries.
   */
  async transaction(callback) {
    if (!this.pool || this.isEnding) {
      throw new Error('Not connected to database');
    }
    
    let client;
    try {
      client = await this.pool.connect();
    } catch (err) {
      if (err.message.includes('calling end on the pool')) {
        throw new Error('Not connected to database')
      }
      throw err
    }

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async testConnection(config) {
    const testPool = new Pool({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || '',
      user: config.user || '',
      password: config.password || '',
      connectionTimeoutMillis: 5000
    })
    try {
      const client = await testPool.connect()
      await client.query('SELECT 1')
      client.release()
      await testPool.end()
      return { success: true, message: 'Connection successful' }
    } catch (err) {
      await testPool.end().catch(() => {})
      return { success: false, message: err.message }
    }
  }

  isConnected() {
    return this.pool !== null
  }
}

let instance = null

export function getDatabase(config) {
  if (!instance) {
    instance = new Database(config)
  }
  return instance
}

export { Database }
