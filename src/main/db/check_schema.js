import { getDatabase } from './database.js';

async function run() {
  const db = getDatabase({
    host: 'localhost',
    port: 5432,
    database: 'kmanager',
    user: 'postgres',
    password: 'password' // Will fail if wrong, but let's try
  });

  try {
    await db.connect();
    const res = await db.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'search_chunks';
    `);
    console.log(res.rows[0].pg_get_functiondef);
  } catch (e) {
    console.error(e.message);
  } finally {
    await db.disconnect();
  }
}

run();
