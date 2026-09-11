const { getPool } = require('../lib/db');
const { requireOwner } = require('../lib/auth');

// Owner-only — locked couples, generated match results, and the reveal
// position. Students never read or write any of this.
module.exports = async (req, res) => {
  if(!requireOwner(req, res)) return;
  const pool = getPool();

  if(req.method === 'GET'){
    const { rows } = await pool.query(
      `select locked_pairs, results, reveal_index, reveal_flipped from app_state where id='main'`
    );
    const row = rows[0] || {};
    res.status(200).json({
      lockedPairs: row.locked_pairs || [],
      results: row.results || null,
      revealIndex: row.reveal_index || 0,
      revealFlipped: !!row.reveal_flipped
    });
    return;
  }

  if(req.method === 'PATCH'){
    const body = req.body || {};
    const sets = [];
    const values = [];
    let i = 1;
    if('lockedPairs' in body){ sets.push(`locked_pairs=$${i++}`); values.push(JSON.stringify(body.lockedPairs)); }
    if('results' in body){ sets.push(`results=$${i++}`); values.push(body.results == null ? null : JSON.stringify(body.results)); }
    if('revealIndex' in body){ sets.push(`reveal_index=$${i++}`); values.push(body.revealIndex); }
    if('revealFlipped' in body){ sets.push(`reveal_flipped=$${i++}`); values.push(!!body.revealFlipped); }
    if(!sets.length){ res.status(400).json({ error: 'No fields to update.' }); return; }
    sets.push('updated_at=now()');
    values.push('main');
    await pool.query(`update app_state set ${sets.join(', ')} where id=$${i}`, values);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
