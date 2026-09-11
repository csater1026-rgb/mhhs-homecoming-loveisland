const { getPool } = require('../lib/db');
const { sanitizePerson, validatePerson } = require('../lib/validate');

// Public — anyone can add themselves to the roster. No session required.
module.exports = async (req, res) => {
  if(req.method !== 'POST'){ res.status(405).json({ error: 'Method not allowed' }); return; }

  const p = sanitizePerson(req.body);
  const err = validatePerson(p);
  if(err){ res.status(400).json({ error: err }); return; }

  const pool = getPool();
  await pool.query(
    `insert into islanders
      (name, identity, looking_for, grade, grade_open_to, height_in, height_pref, interests, vibes, date_types, music, activities, comm, bio, source)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'self')`,
    [p.name, p.identity, p.lookingFor, p.grade, p.gradeOpenTo, p.heightIn, p.heightPref, p.interests, p.vibes, p.dateTypes, p.music, p.activities, p.comm, p.bio]
  );
  res.status(200).json({ ok: true });
};
