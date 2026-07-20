/**
 * Service utility for computing raw file and PostgreSQL database relation sizes.
 */
class FileSizeService {
  /**
   * Compute exact table, raw uncompressed file sizes, and per-type breakdown in bytes from PostgreSQL.
   * @param {Object} db - The database client/pool instance.
   * @returns {Promise<{ raw_file_bytes: number, total_db_bytes: number, by_type_details: Object }>}
   */
  async getStorageSize(db) {
    if (!db || typeof db.query !== 'function') {
      return { raw_file_bytes: 0, total_db_bytes: 0, by_type_details: {} }
    }

    let raw_file_bytes = 0
    let total_db_bytes = 0
    const by_type_details = {}

    try {
      // Query total relation size and overall raw file/text bytes
      const sizeRes = await db.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN file_size IS NULL OR file_size <= 0 THEN COALESCE(pg_column_size(content), 0) ELSE file_size END), 0)::bigint AS raw_file_bytes,
          (pg_total_relation_size('documents') + pg_total_relation_size('embedding_documents'))::bigint AS total_db_bytes
        FROM documents
      `)
      if (sizeRes.rows[0]) {
        raw_file_bytes = Number(sizeRes.rows[0].raw_file_bytes || 0)
        total_db_bytes = Number(sizeRes.rows[0].total_db_bytes || 0)
      }
    } catch (sizeErr) {
      console.warn('Could not compute exact storage size via single query, attempting fallback:', sizeErr.message)
      try {
        const rawRes = await db.query('SELECT COALESCE(SUM(CASE WHEN file_size IS NULL OR file_size <= 0 THEN COALESCE(pg_column_size(content), 0) ELSE file_size END), 0)::bigint AS raw_file_bytes FROM documents')
        const relSize = await db.query("SELECT (pg_total_relation_size('documents') + pg_total_relation_size('embedding_documents'))::bigint AS total_db_bytes")
        raw_file_bytes = Number(rawRes.rows[0]?.raw_file_bytes || 0)
        total_db_bytes = Number(relSize.rows[0]?.total_db_bytes || 0)
      } catch (fallbackErr) {
        console.warn('Fallback storage size calculation failed:', fallbackErr.message)
      }
    }

    try {
      // Query per-file_type count and byte distribution
      const typeRes = await db.query(`
        SELECT 
          file_type, 
          COUNT(*)::bigint AS cnt, 
          COALESCE(SUM(CASE WHEN file_size IS NULL OR file_size <= 0 THEN COALESCE(pg_column_size(content), 0) ELSE file_size END), 0)::bigint AS type_bytes
        FROM documents 
        GROUP BY file_type
      `)
      typeRes.rows.forEach(r => {
        const formatKey = r.file_type || 'unknown'
        const count = Number(r.cnt || 0)
        const bytes = Number(r.type_bytes || 0)
        const entry = { count, bytes }

        // Store under exact key, dotted key (.md), and clean key (md) so frontend lookup always succeeds
        by_type_details[formatKey] = entry
        if (formatKey.startsWith('.')) {
          by_type_details[formatKey.slice(1)] = entry
        } else {
          by_type_details[`.${formatKey}`] = entry
        }
      })
    } catch (typeErr) {
      console.warn('Could not compute per-type byte distribution:', typeErr.message)
    }

    return { raw_file_bytes, total_db_bytes, by_type_details }
  }

  /**
   * Helper to format bytes into readable units (B, KB, MB, GB, TB).
   */
  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
  }
}

export default new FileSizeService()
