const { createSessionToken, setSessionCookie, checkPasscode } = require('../lib/auth');

module.exports = async (req, res) => {
  if(req.method !== 'POST'){ res.status(405).json({ error: 'Method not allowed' }); return; }
  const { passcode } = req.body || {};
  if(!checkPasscode(passcode)){
    res.status(401).json({ error: 'Wrong passcode.' });
    return;
  }
  setSessionCookie(res, createSessionToken());
  res.status(200).json({ ok: true });
};
