const { Client } = require('pg'); 
const client = new Client('postgres://postgres:postgres@localhost:5432/kmanager'); 
client.connect().then(async () => { 
  console.log('Connected'); 
  try { 
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto;'); 
    for(let i=0; i<85; i++){ 
      const score = Math.random() > 0.3 ? 1 : (Math.random() > 0.5 ? 0 : -1); 
      await client.query('INSERT INTO search_feedback (query_id, query_text, score, response) VALUES (gen_random_uuid(), $1, $2, $3)', ['Sample Query', score, 'Sample Response']); 
    } 
    console.log('Injected feedback'); 
  } catch(e) { 
    console.error(e) 
  }
  client.end(); 
})
