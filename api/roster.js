const { getPool, rowToPerson } = require('../lib/db');
const { requireOwner } = require('../lib/auth');
const { sanitizePerson, validatePerson } = require('../lib/validate');

// Owner-only — reading, adding, editing, or removing anyone on the roster
// all require a valid signed-in session.
module.exports = async (req, res) => {
  if(!requireOwner(req, res)) return;
  const pool = getPool();

  if(req.method === 'GET'){
    const { rows } = await pool.query('select * from islanders order by created_at asc');
    res.status(200).json({ islanders: rows.map(rowToPerson) });
    return;
  }

  if(req.method === 'POST'){
    const p = sanitizePerson(req.body);
    const err = validatePerson(p);
    if(err){ res.status(400).json({ error: err }); return; }
    const { rows } = await pool.query(
      `insert into islanders
        (name, identity, looking_for, grade, grade_open_to, height_in, height_pref, interests, vibes, date_types, music, activities, comm, bio, source)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'owner')
       returning *`,
      [p.name, p.identity, p.lookingFor, p.grade, p.gradeOpenTo, p.heightIn, p.heightPref, p.interests, p.vibes, p.dateTypes, p.music, p.activities, p.comm, p.bio]
    );
    res.status(200).json({ islander: rowToPerson(rows[0]) });
    return;
  }

  if(req.method === 'PATCH'){
    const { id } = req.body || {};
    if(!id){ res.status(400).json({ error: 'Missing id.' }); return; }
    const p = sanitizePerson(req.body);
    const err = validatePerson(p);
    if(err){ res.status(400).json({ error: err }); return; }
    const { rows } = await pool.query(
      `update islanders set
        name=$1, identity=$2, looking_for=$3, grade=$4, grade_open_to=$5,
        height_in=$6, height_pref=$7, interests=$8, vibes=$9, date_types=$10,
        music=$11, activities=$12, comm=$13, bio=$14
       where id=$15
       returning *`,
      [p.name, p.identity, p.lookingFor, p.grade, p.gradeOpenTo, p.heightIn, p.heightPref, p.interests, p.vibes, p.dateTypes, p.music, p.activities, p.comm, p.bio, id]
    );
    if(!rows.length){ res.status(404).json({ error: 'Not found.' }); return; }
    res.status(200).json({ islander: rowToPerson(rows[0]) });
    return;
  }

  if(req.method === 'DELETE'){
    const { id } = req.body || {};
    if(!id){ res.status(400).json({ error: 'Missing id.' }); return; }
    await pool.query('delete from islanders where id=$1', [id]);
    // Drop any locked pair that referenced the deleted islander.
    await pool.query(
      `update app_state
       set locked_pairs = (
         select coalesce(jsonb_agg(pair), '[]'::jsonb)
         from jsonb_array_elements(locked_pairs) as pair
         where not (pair ? $1)
       )
       where id='main'`,
      [id]
    );
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
