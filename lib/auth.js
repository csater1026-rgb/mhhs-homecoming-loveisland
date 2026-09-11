const crypto = require('crypto');

const COOKIE_NAME = 'owner_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function sign(value){
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(value).digest('hex');
}

function createSessionToken(){
  const expires = String(Date.now() + SESSION_TTL_MS);
  return `${expires}.${sign(expires)}`;
}

function verifySessionToken(token){
  if(!token) return false;
  const dot = token.indexOf('.');
  if(dot === -1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload);
  const expectedBuf = Buffer.from(expected);
  const sigBuf = Buffer.from(sig);
  if(expectedBuf.length !== sigBuf.length) return false;
  if(!crypto.timingSafeEqual(expectedBuf, sigBuf)) return false;
  const expires = parseInt(payload, 10);
  return !!expires && Date.now() <= expires;
}

function parseCookies(req){
  const header = req.headers.cookie;
  const out = {};
  if(!header) return out;
  header.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if(idx === -1) return;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function setSessionCookie(res, token){
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`);
}

function clearSessionCookie(res){
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`);
}

function isOwner(req){
  return verifySessionToken(parseCookies(req)[COOKIE_NAME]);
}

function requireOwner(req, res){
  if(!isOwner(req)){
    res.status(401).json({ error: 'Not signed in.' });
    return false;
  }
  return true;
}

function checkPasscode(passcode){
  const expected = process.env.OWNER_PASSCODE || '';
  const a = Buffer.from(String(passcode == null ? '' : passcode));
  const b = Buffer.from(expected);
  if(a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { createSessionToken, setSessionCookie, clearSessionCookie, requireOwner, isOwner, checkPasscode };
