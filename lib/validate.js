const GRADES = ['9', '10', '11', '12'];

function clampStr(s, max){
  return typeof s === 'string' ? s.slice(0, max) : '';
}
function clampArr(a, maxItems, maxLen){
  if(!Array.isArray(a)) return [];
  return a.slice(0, maxItems).map(v => typeof v === 'string' ? v.slice(0, maxLen) : '').filter(Boolean);
}

// Coerces/clips an incoming submission before it ever reaches SQL — the
// join endpoint accepts requests from anyone, so nothing here can be
// trusted just because the client-side form already validated it.
function sanitizePerson(p){
  p = p && typeof p === 'object' ? p : {};
  return {
    name: clampStr(p.name, 80).trim(),
    identity: ['guy', 'girl'].includes(p.identity) ? p.identity : null,
    lookingFor: clampArr(p.lookingFor, 2, 10).filter(v => ['guys', 'girls'].includes(v)),
    grade: GRADES.includes(p.grade) ? p.grade : null,
    gradeOpenTo: clampArr(p.gradeOpenTo, 4, 4).filter(v => GRADES.includes(v)),
    heightIn: (typeof p.heightIn === 'number' && p.heightIn >= 60 && p.heightIn <= 77) ? Math.round(p.heightIn) : null,
    heightPref: clampArr(p.heightPref, 4, 40),
    interests: clampArr(p.interests, 20, 60),
    vibes: clampArr(p.vibes, 3, 60),
    dateTypes: clampArr(p.dateTypes, 3, 60),
    music: clampArr(p.music, 20, 60),
    activities: clampArr(p.activities, 20, 60),
    comm: clampStr(p.comm, 40) || null,
    bio: clampStr(p.bio, 300)
  };
}

function validatePerson(p){
  if(!p.name) return 'Please enter a name.';
  if(!p.identity) return 'Please choose an identity.';
  if(!p.lookingFor.length) return 'Please choose at least one "open to matching with" option.';
  if(!p.grade) return 'Please choose a grade.';
  if(!p.gradeOpenTo.length) return "Please choose at least one grade you're open to matching with.";
  if(p.heightIn == null) return 'Please choose your height.';
  if(!p.interests.length) return 'Please pick at least one interest.';
  return null;
}

module.exports = { sanitizePerson, validatePerson };
