const { Pool } = require('pg');

// Reused across invocations of the same warm serverless instance instead of
// opening a new connection pool per request.
let pool;
function getPool(){
  if(!pool){
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

function rowToPerson(row){
  return {
    id: row.id,
    name: row.name,
    identity: row.identity,
    lookingFor: row.looking_for || [],
    grade: row.grade,
    gradeOpenTo: row.grade_open_to || [],
    heightIn: row.height_in,
    heightPref: row.height_pref || [],
    interests: row.interests || [],
    vibes: row.vibes || [],
    dateTypes: row.date_types || [],
    music: row.music || [],
    activities: row.activities || [],
    comm: row.comm,
    bio: row.bio,
    source: row.source,
    createdAt: row.created_at
  };
}

module.exports = { getPool, rowToPerson };
