const { getPool } = require('../lib/db');
const { requireOwner } = require('../lib/auth');

// Owner-only — wipes the entire roster and match state. The passcode
// itself lives outside the database (a Vercel env var), so it's untouched.
module.exports = async (req, res) => {
  if(!requireOwner(req, res)) return;
  if(req.method !== 'POST'){ res.status(405).json({ error: 'Method not allowed' }); return; }
  const pool = getPool();
  await pool.query('delete from islanders');
  await pool.query(
    `update app_state set locked_pairs='[]', results=null, reveal_index=0, reveal_flipped=false, updated_at=now() where id='main'`
  );
  res.status(200).json({ ok: true });
};
